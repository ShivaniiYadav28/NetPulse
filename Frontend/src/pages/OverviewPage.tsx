import { useMemo, useState } from "react";

import StatsOverview from "../components/dashboard/StatsOverview";
import LatencyChart from "../components/dashboard/LatencyChart";
import ErrorAlert from "../components/common/ErrorAlert";

import { useDevices } from "../hooks/useDevices";
import { getDeviceStats } from "../utils/deviceUtils";

export default function OverviewPage() {
  const dashboard = useDevices();
  const [selectedDevice, setSelectedDevice] = useState("all");

  const stats = useMemo(
    () => getDeviceStats(dashboard.devices, dashboard.history),
    [dashboard.devices, dashboard.history],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor the health and performance of your network.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void dashboard.fetchDashboard(true)}
          disabled={dashboard.refreshing}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {dashboard.refreshing ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      <ErrorAlert message={dashboard.error} onDismiss={() => dashboard.setError("")} />

      <StatsOverview stats={stats} />

      <LatencyChart
        devices={dashboard.devices}
        history={dashboard.history}
        selectedDevice={selectedDevice}
        onSelectDevice={setSelectedDevice}
        refreshing={dashboard.refreshing}
        onRefresh={() => void dashboard.fetchDashboard(true)}
      />
    </div>
  );
}
