/**
 * Motor da simulação do "laboratório de servidores" da home.
 *
 * É um modelo didático — balanceador round robin, health checks, auto scaling
 * por CPU e rolling update — que roda inteiro no navegador do visitante. Nada
 * aqui representa métricas reais de produção. Todas as funções são puras: recebem
 * o estado e devolvem um novo, o que mantém a simulação testável.
 */

export type InstanceState = "booting" | "healthy" | "down" | "draining";

export type Instance = {
  id: string;
  version: number;
  state: InstanceState;
  /** Segundos no estado atual. */
  age: number;
  /** O balanceador ainda envia tráfego para esta instância. */
  routed: boolean;
  /** Uso de CPU, de 0 a 1. */
  cpu: number;
};

export type ClusterEvent = { id: number; at: number; tone: "info" | "ok" | "warn" | "error"; text: string };

export type Sample = { throughput: number; latency: number; errorRate: number };

export type Cluster = {
  time: number;
  /** Requisições por segundo pedidas pelo visitante. */
  rps: number;
  /** Segundos restantes do pico de tráfego. */
  burst: number;
  autoscale: boolean;
  desired: number;
  version: number;
  deploying: boolean;
  instances: Instance[];
  cooldown: number;
  hotFor: number;
  coldFor: number;
  alarm: boolean;
  metrics: Sample & { cpu: number; demand: number };
  history: Sample[];
  events: ClusterEvent[];
  seq: number;
};

/** Requisições por segundo que uma instância atende com folga. */
export const CAPACITY = 120;
export const MIN_INSTANCES = 1;
export const MAX_INSTANCES = 5;
export const MAX_RPS = 600;

const BOOT_SECONDS = 3;
const HEALTH_CHECK_SECONDS = 2;
const DRAIN_SECONDS = 2;
const BURST_SECONDS = 6;
const BURST_FACTOR = 2.5;
const BASE_LATENCY = 38;
const HISTORY = 60;

const instanceId = (seq: number) => `i-${((seq * 2654435761) >>> 0).toString(16).padStart(8, "0").slice(0, 4)}`;

const percent = (value: number) => `${Math.round(value * 100)}%`;

function log(cluster: Cluster, tone: ClusterEvent["tone"], text: string): Cluster {
  const event = { id: cluster.seq, at: cluster.time, tone, text };
  return { ...cluster, seq: cluster.seq + 1, events: [...cluster.events, event].slice(-60) };
}

function launch(cluster: Cluster, healthy = false): Cluster {
  const instance: Instance = {
    id: instanceId(cluster.seq + 1),
    version: cluster.version,
    state: healthy ? "healthy" : "booting",
    age: 0,
    routed: healthy,
    cpu: 0.05,
  };
  return { ...cluster, seq: cluster.seq + 1, instances: [...cluster.instances, instance] };
}

export function createCluster(): Cluster {
  let cluster: Cluster = {
    time: 0,
    rps: 140,
    burst: 0,
    autoscale: true,
    desired: 2,
    version: 1,
    deploying: false,
    instances: [],
    cooldown: 0,
    hotFor: 0,
    coldFor: 0,
    alarm: false,
    metrics: { throughput: 0, latency: 0, errorRate: 0, cpu: 0, demand: 0 },
    history: [],
    events: [],
    seq: 0,
  };
  cluster = launch(launch(cluster, true), true);
  return log(cluster, "info", "cluster iniciado: 2 instâncias atrás do balanceador");
}

const alive = (instance: Instance) => instance.state === "booting" || instance.state === "healthy";

// ------------------------------------------------------------------ ações

export function setRps(cluster: Cluster, rps: number): Cluster {
  return { ...cluster, rps: Math.max(0, Math.min(MAX_RPS, Math.round(rps))) };
}

export function triggerBurst(cluster: Cluster): Cluster {
  if (cluster.burst > 0) return cluster;
  return log({ ...cluster, burst: BURST_SECONDS }, "warn", `pico de tráfego: ×${BURST_FACTOR.toLocaleString("pt-BR")} por ${BURST_SECONDS}s`);
}

export function killInstance(cluster: Cluster, id: string): Cluster {
  const target = cluster.instances.find((instance) => instance.id === id);
  if (!target || !alive(target)) return cluster;

  const instances = cluster.instances.map((instance) =>
    instance.id === id ? { ...instance, state: "down" as const, age: 0 } : instance,
  );
  return log({ ...cluster, instances }, "error", `${id} parou de responder`);
}

export function setAutoscale(cluster: Cluster, autoscale: boolean): Cluster {
  return log({ ...cluster, autoscale, hotFor: 0, coldFor: 0 }, "info", `auto scaling ${autoscale ? "ligado" : "desligado"}`);
}

export function changeDesired(cluster: Cluster, delta: number): Cluster {
  const desired = Math.max(MIN_INSTANCES, Math.min(MAX_INSTANCES, cluster.desired + delta));
  if (desired === cluster.desired) return cluster;
  return log({ ...cluster, desired }, "info", `capacidade desejada ajustada para ${desired}`);
}

export function startDeploy(cluster: Cluster): Cluster {
  if (cluster.deploying) return cluster;
  const version = cluster.version + 1;
  return log({ ...cluster, version, deploying: true }, "info", `deploy v1.${version} iniciado (rolling update)`);
}

// ------------------------------------------------------------------- tick

export function tick(previous: Cluster, dt: number): Cluster {
  let cluster: Cluster = { ...previous, time: previous.time + dt, burst: Math.max(0, previous.burst - dt) };

  // 1. ciclo de vida das instâncias
  const survivors: Instance[] = [];
  for (const current of cluster.instances) {
    const instance = { ...current, age: current.age + dt };

    if (instance.state === "booting" && instance.age >= BOOT_SECONDS) {
      survivors.push({ ...instance, state: "healthy", age: 0, routed: true });
      cluster = log(cluster, "ok", `${instance.id} passou no health check — recebendo tráfego`);
    } else if (instance.state === "down" && instance.routed && instance.age >= HEALTH_CHECK_SECONDS) {
      survivors.push({ ...instance, routed: false });
      cluster = log(cluster, "error", `health check falhou em ${instance.id} — removida do balanceador`);
    } else if (instance.state === "down" && instance.age >= HEALTH_CHECK_SECONDS + 1.5) {
      cluster = log(cluster, "info", `${instance.id} encerrada`);
    } else if (instance.state === "draining" && instance.age >= DRAIN_SECONDS) {
      cluster = log(cluster, "info", `${instance.id} drenada e encerrada`);
    } else {
      survivors.push(instance);
    }
  }
  cluster = { ...cluster, instances: survivors };

  // 2. auto scaling por CPU média (pausado durante um deploy)
  const serving = cluster.instances.filter((instance) => instance.state === "healthy");
  const averageCpu = serving.length > 0 ? serving.reduce((sum, instance) => sum + instance.cpu, 0) / serving.length : 0;
  cluster = { ...cluster, cooldown: Math.max(0, cluster.cooldown - dt) };

  if (cluster.autoscale && !cluster.deploying && serving.length > 0) {
    const hotFor = averageCpu > 0.75 ? cluster.hotFor + dt : 0;
    const coldFor = averageCpu < 0.3 ? cluster.coldFor + dt : 0;
    cluster = { ...cluster, hotFor, coldFor };

    if (hotFor >= 1.5 && cluster.cooldown === 0 && cluster.desired < MAX_INSTANCES) {
      cluster = { ...cluster, desired: cluster.desired + 1, cooldown: 4, hotFor: 0 };
      cluster = log(cluster, "warn", `CPU média em ${percent(averageCpu)} — scale-out para ${cluster.desired} instâncias`);
    } else if (coldFor >= 5 && cluster.cooldown === 0 && cluster.desired > 2) {
      cluster = { ...cluster, desired: cluster.desired - 1, cooldown: 4, coldFor: 0 };
      cluster = log(cluster, "info", `CPU média em ${percent(averageCpu)} — scale-in para ${cluster.desired} instâncias`);
    }
  }

  // 3. mantém a capacidade desejada (e a instância extra do rolling update)
  const outdated = cluster.instances.filter((instance) => alive(instance) && instance.version < cluster.version);
  if (cluster.deploying && outdated.length === 0) {
    cluster = log({ ...cluster, deploying: false }, "ok", `deploy v1.${cluster.version} concluído sem downtime`);
  }

  const target = cluster.desired + (cluster.deploying ? 1 : 0);
  const living = cluster.instances.filter(alive);
  const booting = living.some((instance) => instance.state === "booting");

  if (living.length < target) {
    cluster = launch(cluster);
    cluster = log(cluster, "info", `lançando ${cluster.instances.at(-1)!.id} (v1.${cluster.version})`);
  } else if (!booting && (living.length > target || (cluster.deploying && outdated.length > 0))) {
    // Só drena depois que a substituta está saudável. Sai primeiro a versão mais
    // antiga; entre versões iguais, a instância mais nova.
    const chosen = living
      .map((instance, index) => ({ instance, index }))
      .filter(({ instance }) => instance.state === "healthy")
      .sort((a, b) => a.instance.version - b.instance.version || b.index - a.index)
      .at(0)?.instance;

    if (chosen) {
      cluster = {
        ...cluster,
        instances: cluster.instances.map((instance) =>
          instance.id === chosen.id ? { ...instance, state: "draining" as const, age: 0, routed: false } : instance,
        ),
      };
      cluster = log(cluster, "info", `drenando ${chosen.id} (v1.${chosen.version})`);
    }
  }

  // 4. distribui o tráfego entre as instâncias que o balanceador considera saudáveis
  const demand = cluster.rps * (cluster.burst > 0 ? BURST_FACTOR : 1);
  const routed = cluster.instances.filter((instance) => instance.routed);
  const share = routed.length > 0 ? demand / routed.length : 0;
  const utilization = share / CAPACITY;

  let served = 0;
  let failed = routed.length === 0 ? demand : 0;
  let latency = 0;

  const smooth = Math.min(1, dt * 3);
  const instances = cluster.instances.map((instance) => {
    if (!instance.routed) return { ...instance, cpu: instance.cpu + (0.04 - instance.cpu) * smooth };
    if (instance.state === "down") {
      failed += share;
      return { ...instance, cpu: instance.cpu + (0 - instance.cpu) * smooth };
    }

    const handled = Math.min(share, CAPACITY * 1.15);
    served += handled;
    failed += share - handled;
    latency += handled * Math.min(1800, BASE_LATENCY * (1 + 5 * utilization ** 4));
    return { ...instance, cpu: instance.cpu + (Math.min(1, utilization) - instance.cpu) * smooth };
  });

  const sample: Sample = {
    throughput: served,
    latency: served > 0 ? latency / served : 0,
    errorRate: demand > 0 ? failed / demand : 0,
  };

  cluster = {
    ...cluster,
    instances,
    metrics: { ...sample, cpu: averageCpu, demand },
    history: [...cluster.history, sample].slice(-HISTORY),
  };

  // 5. alarme de erros
  if (!cluster.alarm && sample.errorRate > 0.02) {
    cluster = log({ ...cluster, alarm: true }, "error", `alarme: ${percent(sample.errorRate)} das requisições falhando (5xx)`);
  } else if (cluster.alarm && sample.errorRate < 0.005) {
    cluster = log({ ...cluster, alarm: false }, "ok", "taxa de erro normalizada");
  }

  return cluster;
}
