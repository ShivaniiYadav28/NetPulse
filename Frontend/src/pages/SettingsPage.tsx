import { useState, type ReactNode } from "react";
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
import {
  DEFAULT_DISPLAY_PREFERENCES,
  saveDisplayPreferences,
  resetDisplayPreferences,
  loadDisplayPreferences,
  type DisplayPreferences,
} from "../utils/displayPreferences";
import ErrorAlert from "../components/common/ErrorAlert";

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<DisplayPreferences>(loadDisplayPreferences);
  const [saved, setSaved] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  const dashboard = useDevices();

  function updatePreference<K extends keyof DisplayPreferences>(
    key: K,
    value: DisplayPreferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setSettingsError("");
  }

  function savePreferences() {
    try {
      saveDisplayPreferences(preferences);
      setSaved(true);
      setSettingsError("");
    } catch {
      setSaved(false);
      setSettingsError(
        "Unable to save preferences in this browser. Check browser storage settings.",
      );
    }
  }

  function resetPreferences() {
    setPreferences({ ...DEFAULT_DISPLAY_PREFERENCES });
    setSaved(false);
    setSettingsError("");

    try {
      resetDisplayPreferences();
    } catch {
      setSettingsError("Unable to clear saved preferences.");
    }
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
        message={settingsError || dashboard.error}
        onDismiss={() => {
          setSettingsError("");
          dashboard.setError("");
        }}
      />

      <section className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2.5 text-sky-300">
            <Monitor size={20} />
          </div>
          <div>
            <h2 className="font-bold text-white">Workspace preferences</h2>
            <p className="mt-1 text-xs text-slate-400">
              Personalize your NetPulse workspace.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-200">
            Workspace name
            <input
              value={preferences.workspaceName}
              maxLength={60}
              onChange={(event) =>
                updatePreference("workspaceName", event.target.value)
              }
              placeholder="Enter a workspace name"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Monitoring refresh interval
            <select
              value={preferences.refreshInterval}
              onChange={(event) =>
                updatePreference("refreshInterval", event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"
            >
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">60 seconds</option>
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          The saved interval controls automatic monitor data refresh on the
          Monitors page. It does not change the backend monitoring schedule.
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
              Choose your preferred monitor presentation.
            </p>
          </div>
        </div>

        <PreferenceRow
          title="Compact monitor cards"
          description="Prefer a denser presentation of monitor information."
          enabled={preferences.compactCards}
          onToggle={() =>
            updatePreference("compactCards", !preferences.compactCards)
          }
        />

        <div className="my-4 border-t border-slate-800" />

        <PreferenceRow
          title="Prioritize offline monitors"
          description="Prefer offline devices before online devices in monitor lists."
          enabled={preferences.showOfflineFirst}
          onToggle={() =>
            updatePreference(
              "showOfflineFirst",
              !preferences.showOfflineFirst,
            )
          }
        />

        <p className="mt-4 text-xs leading-5 text-slate-500">
          These display choices are saved in your browser and applied to the
          monitor list after you save them.
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
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            Preferences are stored locally in this browser, not in your account
            or the backend database.
          </p>

          {saved && (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
              <Check size={16} />
              Preferences saved successfully.
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
          Alert delivery and account-wide workspace settings are separate
          features. This page does not change backend alert notifications or
          account settings.
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
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
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
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <div className="text-sky-300">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}
