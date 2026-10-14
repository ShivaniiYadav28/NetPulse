import { useMemo } from "react";
import { Activity, RefreshCw } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Device, HistoryPoint } from "../../types/device";
import { buttonSecondary, inputClass } from "../common/ui";

export default function LatencyChart({
  devices,
  history,
  selectedDevice,
  onSelectDevice,
  refreshing,
  onRefresh,
}: {
  devices: Device[];
  history: HistoryPoint[];
  selectedDevice: string;
  onSelectDevice: (id: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const data = useMemo(
    () =>
      history
        .filter(
          (point) =>
            point.checkedAt &&
            point.latency !== null &&
            Number.isFinite(point.latency) &&
            (selectedDevice === "all" || point.deviceId === selectedDevice),
        )
        .map((point) => ({
          time: new Date(point.checkedAt!).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          timestamp: new Date(point.checkedAt!).getTime(),
          latency: point.latency as number,
          device: point.name,
          status: point.status,
        })),
    [history, selectedDevice],
  );
  return (
    <section className="mb-5 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Latency history</h2>
          <p className="mt-1 text-xs text-slate-400">
            Response time from recorded monitoring checks
          </p>
        </div>
        <select
          className={`${inputClass} mt-0 w-auto min-w-36`}
          value={selectedDevice}
          onChange={(event) => onSelectDevice(event.target.value)}
          aria-label="Choose device for latency chart"
        >
          <option value="all">All devices</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
      </div>
      {data.length ? (
        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#263a52" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                minTickGap={28}
                axisLine={{ stroke: "#345675" }}
                tickLine={{ stroke: "#345675" }}
              />
              <YAxis
                unit=" ms"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                width={60}
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
                labelStyle={{ color: "#7dd3fc" }}
                formatter={(value, _name, item) => [`${value} ms`, item.payload.device]}
                labelFormatter={(_label, payload) =>
                  payload?.[0]?.payload
                    ? new Date(payload[0].payload.timestamp).toLocaleString()
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
                activeDot={{ r: 5, fill: "#7dd3fc", stroke: "#0c3b59", strokeWidth: 2 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 px-5 py-8 text-center">
          <Activity size={28} className="mb-3 text-slate-500" />
          <strong className="text-sm font-semibold text-slate-200">
            No latency history available
          </strong>
          <p className="mt-2 max-w-md text-xs leading-5 text-slate-400">
            Recorded measurements will appear here when monitoring history is available.
          </p>
          <button
            className={`${buttonSecondary} mt-4`}
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Reload history
          </button>
        </div>
      )}
    </section>
  );
}
