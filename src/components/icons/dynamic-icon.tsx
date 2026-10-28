import {
  Activity,
  Award,
  Boxes,
  Cloud,
  Code2,
  Container,
  Cpu,
  Database,
  GitBranch,
  Gauge,
  Globe,
  Layers,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Network,
  Rocket,
  Server,
  Settings2,
  Shield,
  Terminal,
  TrendingDown,
  TrendingUp,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Whitelisted icon set the admin can pick from. Keeping it explicit avoids
 * shipping the whole lucide catalogue to the client and makes stored values
 * safe to render.
 */
export const ICON_MAP = {
  activity: Activity,
  award: Award,
  boxes: Boxes,
  cloud: Cloud,
  code: Code2,
  container: Container,
  cpu: Cpu,
  database: Database,
  "git-branch": GitBranch,
  gauge: Gauge,
  globe: Globe,
  layers: Layers,
  dashboard: LayoutDashboard,
  lock: Lock,
  message: MessageSquare,
  network: Network,
  rocket: Rocket,
  server: Server,
  settings: Settings2,
  shield: Shield,
  terminal: Terminal,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  workflow: Workflow,
  zap: Zap,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_MAP;

export const ICON_NAMES = Object.keys(ICON_MAP) as IconName[];

export function DynamicIcon({
  name,
  size = 18,
  className,
  fallback = "layers",
}: {
  name?: string | null;
  size?: number;
  className?: string;
  fallback?: IconName;
}) {
  const Icon = (name && ICON_MAP[name as IconName]) || ICON_MAP[fallback];
  return <Icon size={size} className={className} aria-hidden />;
}
