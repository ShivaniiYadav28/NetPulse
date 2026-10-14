import { Clock, Server, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import StatCard, { type StatItem } from "./StatCard";
import type { DeviceStats } from "../../utils/deviceUtils";
export default function StatsOverview({ stats }: { stats: DeviceStats }) {
  const items: StatItem[] = [
    {
      label: "Total devices",
      value: stats.total,
      description: "Monitored endpoints",
      icon: Server,
      color: "text-sky-400",
      iconBg: "bg-sky-400/10",
      iconBorder: "border-sky-400/25",
    },
    {
      label: "Online",
      value: stats.online,
      description: "Responding endpoints",
      icon: Wifi,
      color: "text-emerald-400",
      iconBg: "bg-emerald-400/10",
      iconBorder: "border-emerald-400/25",
    },
    {
      label: "Offline",
      value: stats.offline,
      description: "Unreachable endpoints",
      icon: WifiOff,
      color: "text-rose-400",
      iconBg: "bg-rose-400/10",
      iconBorder: "border-rose-400/25",
    },
    {
      label: "Average latency",
      value: stats.averageLatency === null ? "—" : `${stats.averageLatency} ms`,
      description: "Across measured devices",
      icon: Clock,
      color: "text-amber-400",
      iconBg: "bg-amber-400/10",
      iconBorder: "border-amber-400/25",
    },
    {
      label: "Uptime",
      value: stats.uptime === null ? "—" : `${stats.uptime}%`,
      description: "Based on recorded checks",
      icon: ShieldCheck,
      color: "text-sky-400",
      iconBg: "bg-sky-400/10",
      iconBorder: "border-sky-400/25",
    },
  ];
  return (
    <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </section>
  );
}
