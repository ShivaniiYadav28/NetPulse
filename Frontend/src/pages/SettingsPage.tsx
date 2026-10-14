
import { useState } from "react";
import {
  Activity,
  Bell,
  Check,
  Database,
  Gauge,
  Globe,
  Monitor,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
} from "lucide-react";

import { useDevices } from "../hooks/useDevices";
import ErrorAlert from "../components/common/ErrorAlert";

export default function SettingsPage() {
  const dashboard = useDevices();

  const [workspaceName, setWorkspaceName] = useState("NetPulse Workspace");
  const [refreshInterval, setRefreshInterval] = useState("10");
  const [compactCards, setCompactCards] = useState(false);
  const [showOfflineFirst, setShowOfflineFirst] = useState(true);
  const [saved, setSaved] = useState(false);

  function savePreferences() {
    setSaved(true);
  }

  function resetPreferences() {
    setWorkspaceName("NetPulse Workspace");
    setRefreshInterval("10");
    setCompactCards(false);
    setShowOfflineFirst(true);
    setSaved(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <Settings2 size={24} className="text-sky-400" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure your workspace display and review your monitoring connection.
        </p>
      </div>

      <ErrorAlert
        message={dashboard.error}
        onDismiss={() => dashboard.setError("")}
      />

      <section className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2.5 text-sky-300">
            <Monitor size={20} />
          </div>
          <div>
            <h2 className="font-bold text-white">Workspace preferences</h2>
            <p className="mt-1 text-xs text-slate-400">
              Personalize how the dashboard is presented.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-200">
            Workspace name
            <input
              value={workspaceName}
              maxLength={60}
              onChange={(event) => {
                setWorkspaceName(event.target.value);
                setSaved(false);
              }}
              placeholder="Enter a workspace name"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Display refresh preference
            <select
              value={refreshInterval}
              onChange={(event) => {
                setRefreshInterval(event.target.value);
                setSaved(false);
              }}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
            >
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">60 seconds</option>
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          The current data hook refreshes automatically every 10 seconds. The interval selection above is a saved UI preference and does not change that hook.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5 text-violet-300">
            <Gauge size={20} />
          </div>
          <div>
            <h2 className="font-bold text-white">Dashboard display</h2>
            <p className="mt-1 text-xs text-slate-400">
              Adjust your display preferences for this session.
            </p>
          </div>
        </div>

        <PreferenceRow
          title="Compact monitor cards"
          description="Prefer a denser presentation of monitor information."
          enabled={compactCards}
          onToggle={() => {
            setCompactCards((value) => !value);
            setSaved(false);
          }}
        />

        <div className="my-4 border-t border-slate-800" />

        <PreferenceRow
          title="Prioritize offline monitors"
          description="Choose whether offline devices should be prioritized in your preferred view."
          enabled={showOfflineFirst}
          onToggle={() => {
            setShowOfflineFirst((value) => !value);
            setSaved(false);
          }}
        />

        <p className="mt-4 text-xs leading-5 text-slate-500">
          These preferences are held in React state for the current page session. The existing monitor list does not automatically apply them.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-300">
            <Database size={20} />
          </div>
          <div>
            <h2 className="font-bold text-white">System information</h2>
            <p className="mt-1 text-xs text-slate-400">
              Current frontend monitoring data.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow
            icon={<Globe size={17} />}
            label="Configured monitors"
            value={String(dashboard.devices.length)}
          />
          <InfoRow
            icon={<Activity size={17} />}
            label="Recorded history points"
            value={dashboard.history.length.toLocaleString()}
          />
          <InfoRow
            icon={<ShieldCheck size={17} />}
            label="Data source"
            value="Connected API service"
          />
          <InfoRow
            icon={<RefreshCw size={17} />}
            label="Latest page refresh"
            value={dashboard.refreshing ? "In progress" : "Idle"}
          />
        </div>

        <button
          type="button"
          onClick={() => void dashboard.fetchDashboard(true)}
          disabled={dashboard.refreshing}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={dashboard.refreshing ? "animate-spin" : ""}
          />
          Refresh monitoring data
        </button>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-bold text-white">Save display preferences</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Save your current choices for this page session. Persistent settings require a storage mechanism.
          </p>
          {saved && (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
              <Check size={16} />
              Preferences applied for this session.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetPreferences}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            <RotateCcw size={15} />
            Reset
          </button>
          <button
            type="button"
            onClick={savePreferences}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            <Check size={15} />
            Apply preferences
          </button>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-sky-500/15 bg-sky-500/5 p-4">
        <Bell size={17} className="mt-0.5 shrink-0 text-sky-300" />
        <p className="text-xs leading-5 text-slate-400">
          NetPulse currently displays monitoring status and alert conditions using its existing API. Account management, notification delivery, and persistent workspace settings require additional backend functionality.
        </p>
      </div>
    </div>
  );
}

function PreferenceRow({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled ? "bg-sky-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <div className="text-sky-300">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-slate-200">{value}</p>
      </div>
    </div>
  );
}
