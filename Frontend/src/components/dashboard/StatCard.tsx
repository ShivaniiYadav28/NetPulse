import type { LucideIcon } from "lucide-react";
export interface StatItem {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  color: string;
  iconBg: string;
  iconBorder: string;
}
export default function StatCard({ stat }: { stat: StatItem }) {
  const Icon = stat.icon;
  return (
    <article className="relative min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-4 shadow-lg shadow-black/10 transition hover:border-slate-700">
      <div className="absolute left-5 top-0 h-0.5 w-12 rounded-full bg-sky-400" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-400">{stat.label}</span>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${stat.iconBg} ${stat.iconBorder} ${stat.color}`}
        >
          <Icon size={18} />
        </div>
      </div>
      <strong className="mt-3 block break-words text-2xl font-bold tracking-tight text-slate-50">
        {stat.value}
      </strong>
      <p className="mt-1.5 text-[11px] text-slate-400">{stat.description}</p>
    </article>
  );
}
