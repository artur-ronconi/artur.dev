import { describe, expect, it } from "vitest";

import {
  CAPACITY,
  MAX_INSTANCES,
  createCluster,
  killInstance,
  setAutoscale,
  setRps,
  startDeploy,
  tick,
  triggerBurst,
  type Cluster,
} from "@/lib/lab/cluster";

/** Avança a simulação e devolve o estado final e a pior taxa de erro vista. */
function run(cluster: Cluster, seconds: number, dt = 0.25) {
  let worst = 0;
  for (let elapsed = 0; elapsed < seconds; elapsed += dt) {
    cluster = tick(cluster, dt);
    worst = Math.max(worst, cluster.metrics.errorRate);
  }
  return { cluster, worst };
}

const healthy = (cluster: Cluster) => cluster.instances.filter((instance) => instance.state === "healthy");

describe("simulação do cluster", () => {
  it("atende a demanda sem erros em regime estável", () => {
    const { cluster, worst } = run(createCluster(), 10);

    expect(worst).toBe(0);
    expect(cluster.metrics.throughput).toBeCloseTo(140);
    expect(healthy(cluster)).toHaveLength(2);
  });

  it("falha requisições até o health check tirar a instância derrubada, e depois se recupera", () => {
    const start = run(createCluster(), 2).cluster;
    const victim = start.instances[0]!.id;

    const during = run(killInstance(start, victim), 1);
    expect(during.worst).toBeCloseTo(0.5);

    const after = run(during.cluster, 12).cluster;
    expect(after.metrics.errorRate).toBe(0);
    expect(after.instances.some((instance) => instance.id === victim)).toBe(false);
    expect(healthy(after)).toHaveLength(2);
    expect(after.events.some((event) => event.text.includes("health check falhou"))).toBe(true);
  });

  it("escala para fora quando a CPU sobe e volta a atender tudo", () => {
    const { cluster } = run(setRps(createCluster(), 4 * CAPACITY), 40);

    expect(cluster.desired).toBeGreaterThanOrEqual(4);
    expect(cluster.desired).toBeLessThanOrEqual(MAX_INSTANCES);
    expect(cluster.metrics.errorRate).toBe(0);
  });

  it("não escala com o auto scaling desligado", () => {
    const { cluster } = run(setRps(setAutoscale(createCluster(), false), 4 * CAPACITY), 20);

    expect(cluster.desired).toBe(2);
    expect(cluster.metrics.errorRate).toBeGreaterThan(0.3);
  });

  it("faz rolling update sem derrubar requisições", () => {
    const { cluster, worst } = run(startDeploy(createCluster()), 30);

    expect(worst).toBe(0);
    expect(cluster.deploying).toBe(false);
    expect(cluster.instances.every((instance) => instance.version === 2)).toBe(true);
    expect(healthy(cluster)).toHaveLength(2);
  });

  it("o pico de tráfego é temporário", () => {
    const burst = triggerBurst(createCluster());
    expect(tick(burst, 0.25).metrics.demand).toBe(350);
    expect(run(burst, 8).cluster.metrics.demand).toBe(140);
  });
});
