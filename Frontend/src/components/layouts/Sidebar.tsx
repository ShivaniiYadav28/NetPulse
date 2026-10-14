
import { NavLink } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  Monitor,
  ChartNoAxesCombined,
  AlertTriangle,
  BellRing,
  Settings,
  X,
} from "lucide-react";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

const navigation = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Monitors", path: "/monitors", icon: Monitor },
  { label: "Analytics", path: "/analytics", icon: ChartNoAxesCombined },
  { label: "Incidents", path: "/incidents", icon: AlertTriangle },
  { label: "Alerts", path: "/alerts", icon: BellRing },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-[#091321] transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-2">
              <Activity className="h-6 w-6 text-sky-400" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-white">NetPulse</h1>
              <p className="text-xs text-slate-400">Network monitoring</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pt-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border border-sky-500/20 bg-sky-500/10 text-sky-300"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-slate-800 p-4">
          <p className="text-xs text-slate-500">NetPulse</p>
          <p className="mt-1 text-sm text-slate-300">
            Network health monitoring
          </p>
        </div>
      </aside>
    </>
  );
}
