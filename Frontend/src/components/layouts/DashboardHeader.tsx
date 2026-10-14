import { Activity, RefreshCw } from "lucide-react";
import { buttonSecondary } from "../common/ui";
export default function DashboardHeader({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-400/10 text-sky-400">
          <Activity size={25} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">NetPulse</h1>
          <p className="mt-0.5 text-sm text-slate-400">Network monitoring dashboard</p>
        </div>
      </div>
      <button className={buttonSecondary} onClick={onRefresh} disabled={refreshing}>
        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        Refresh
      </button>
    </header>
  );
}
