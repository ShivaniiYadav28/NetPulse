import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Clock3,
  Gauge,
  RefreshCw,
  TrendingUp,
  Wifi,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useDevices } from "../hooks/useDevices";
import ErrorAlert from "../components/common/ErrorAlert";

type RangeOption = "24h" | "7d" | "30d" | "all";

export default function AnalyticsPage() {
  const dashboard = useDevices();
  const [range, setRange] = useState<RangeOption>("7d");
  const [selectedDevice, setSelectedDevice] = useState("all");

  const cutoff = useMemo(() => {
    const now = Date.now();

    if (range === "24h") return now - 24 * 60 * 60 * 1000;
    if (range === "7d") return now - 7 * 24 * 60 * 60 * 1000;
    if (range === "30d") return now - 30 * 24 * 60 * 60 * 1000;

    return 0;
  }, [range]);

  const history = useMemo(
    () =>
      dashboard.history.filter((point) => {
        if (!point.checkedAt) return false;

        const timestamp = new Date(point.checkedAt).getTime();

        if (!Number.isFinite(timestamp) || timestamp < cutoff) {
          return false;
        }

        return (
          selectedDevice === "all" ||
          point.deviceId === selectedDevice
        );
      }),
    [dashboard.history, cutoff, selectedDevice],
  );

  const metrics = useMemo(() => {
    const validStatuses = history.filter(
      (point) =>
        point.status === "Online" || point.status === "Offline",
    );

    const latencyValues = history
      .map((point) => point.latency)
      .filter(
        (value): value is number =>
          value !== null && Number.isFinite(value),
      );

    const averageLatency = latencyValues.length
      ? Math.round(
          latencyValues.reduce((sum, value) => sum + value, 0) /
            latencyValues.length,
        )
      : null;

    const uptime = validStatuses.length
      ? (validStatuses.filter((point) => point.status === "Online")
          .length /
          validStatuses.length) *
        100
      : null;

    const maxLatency = latencyValues.length
      ? Math.max(...latencyValues)
      : null;

    return {
      checks: history.length,
      averageLatency,
      uptime,
      maxLatency,
    };
  }, [history]);

  const chartData = useMemo(
    () =>
      history
        .filter(
          (point) =>
            point.latency !== null &&
            Number.isFinite(point.latency),
        )
        .map((point) => ({
          timestamp: new Date(point.checkedAt!).getTime(),
          time: new Date(point.checkedAt!).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          latency: point.latency as number,
          device: point.name,
        }))
        .sort((a, b) => a.timestamp - b.timestamp),
    [history],
  );

  const deviceRows = useMemo(
    () =>
      dashboard.devices
        .filter(
          (device) =>
            selectedDevice === "all" ||
            device.id === selectedDevice,
        )
        .map((device) => {
          const deviceHistory = history.filter(
            (point) => point.deviceId === device.id,
          );

          const latencies = deviceHistory
            .map((point) => point.latency)
            .filter(
              (value): value is number =>
                value !== null && Number.isFinite(value),
            );

          const valid = deviceHistory.filter(
            (point) =>
              point.status === "Online" ||
              point.status === "Offline",
          );

          const uptime = valid.length
            ? (valid.filter((point) => point.status === "Online")
                .length /
                valid.length) *
              100
            : null;

          return {
            ...device,
            checks: deviceHistory.length,
            averageLatency: latencies.length
              ? Math.round(
                  latencies.reduce((sum, value) => sum + value, 0) /
                    latencies.length,
                )
              : null,
            uptime,
          };
        }),
    [dashboard.devices, history, selectedDevice],
  );

  const selectedDeviceExists =
    selectedDevice === "all" ||
    dashboard.devices.some(
      (device) => device.id === selectedDevice,
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Understand latency, availability, and monitoring
            performance from recorded checks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void dashboard.fetchDashboard(true)}
          disabled={dashboard.refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={
              dashboard.refreshing ? "animate-spin" : ""
            }
          />
          {dashboard.refreshing ? "Refreshing..." : "Refresh data"}
        </button>
      </div>

      <ErrorAlert
        message={dashboard.error}
        onDismiss={() => dashboard.setError("")}
      />

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Time range
          <select
            value={range}
            onChange={(event) =>
              setRange(event.target.value as RangeOption)
            }
            className="min-w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All recorded history</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Monitor
          <select
            value={selectedDevice}
            onChange={(event) =>
              setSelectedDevice(event.target.value)
            }
            className="min-w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500"
          >
            <option value="all">All monitors</option>
            {dashboard.devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </label>

        <p className="ml-auto self-end text-xs text-slate-500">
          Based on {metrics.checks.toLocaleString()} recorded checks
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Recorded checks"
          value={metrics.checks.toLocaleString()}
          detail="Within selected range"
          icon={<Activity size={19} />}
        />

        <MetricCard
          title="Average latency"
          value={
            metrics.averageLatency === null
              ? "—"
              : `${metrics.averageLatency} ms`
          }
          detail="Measurements with recorded latency"
          icon={<Gauge size={19} />}
        />

        <MetricCard
          title="Recorded uptime"
          value={
            metrics.uptime === null
              ? "—"
              : `${metrics.uptime.toFixed(2)}%`
          }
          detail="Online checks divided by known status checks"
          icon={<Wifi size={19} />}
        />

        <MetricCard
          title="Peak latency"
          value={
            metrics.maxLatency === null
              ? "—"
              : `${metrics.maxLatency} ms`
          }
          detail="Highest recorded measurement"
          icon={<TrendingUp size={19} />}
        />
      </div>

      <section className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-4 sm:p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white">
            Latency trend
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Historical response times in milliseconds.
          </p>
        </div>

        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 4, bottom: 12 }}
              >
                <CartesianGrid
                  stroke="#263a52"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="time"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  minTickGap={32}
                  axisLine={{ stroke: "#345675" }}
                  tickLine={{ stroke: "#345675" }}
                />

                <YAxis
                  unit=" ms"
                  width={62}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={{ stroke: "#345675" }}
                  tickLine={{ stroke: "#345675" }}
                />

                <Tooltip
                  contentStyle={{
                    background: "#101d30",
                    border: "1px solid #286487",
                    borderRadius: 10,
                    color: "#eaf6ff",
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value} ms`, "Latency"]}
                  labelFormatter={(_label, payload) =>
                    payload?.[0]?.payload
                      ? new Date(
                          payload[0].payload.timestamp,
                        ).toLocaleString()
                      : ""
                  }
                />

                <Line
                  type="monotone"
                  dataKey="latency"
                  name="Latency"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            title="No latency data for this selection"
            detail="Try another time range or select a monitor with recorded measurements."
          />
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 p-4 sm:p-5">
          <h2 className="text-lg font-bold text-white">
            Monitor performance
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Per-monitor metrics calculated from the selected history
            range and monitor.
          </p>
        </div>

        {!dashboard.devices.length ? (
          <EmptyState
            title="No monitors configured"
            detail="Add a monitor to start collecting performance data."
          />
        ) : !selectedDeviceExists ? (
          <EmptyState
            title="Selected monitor not found"
            detail="Choose another monitor from the filter above."
          />
        ) : deviceRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Monitor</th>
                  <th className="px-5 py-3 font-medium">Current status</th>
                  <th className="px-5 py-3 font-medium">Checks</th>
                  <th className="px-5 py-3 font-medium">Avg. latency</th>
                  <th className="px-5 py-3 font-medium">Recorded uptime</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {deviceRows.map((device) => (
                  <tr
                    key={device.id}
                    className="transition hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-100">
                        {device.name}
                      </p>
                      <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                        {device.address}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <StatusPill status={device.status} />
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {device.checks}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {device.averageLatency === null
                        ? "—"
                        : `${device.averageLatency} ms`}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {device.uptime === null
                        ? "—"
                        : `${device.uptime.toFixed(2)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No monitor data available"
            detail="No monitors match the current selection."
          />
        )}
      </section>

      <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
        <Clock3 size={14} className="mt-0.5 shrink-0" />
        Uptime is estimated from recorded online/offline checks in the
        selected period. It is not a time-weighted SLA calculation.
      </p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {value}
          </p>
        </div>

        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2.5 text-sky-300">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  const online = status.toLowerCase() === "online";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        online
          ? "bg-emerald-400/10 text-emerald-300"
          : "bg-rose-400/10 text-rose-300"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-5 py-10 text-center">
      <Activity size={27} className="mb-3 text-slate-500" />
      <h3 className="text-sm font-semibold text-slate-200">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </div>
  );
}
