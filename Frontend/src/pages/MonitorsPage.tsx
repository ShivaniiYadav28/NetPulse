
import { useMemo, useState } from "react";
import {
  Activity,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";

import { useDevices } from "../hooks/useDevices";
import type { Device } from "../types/device";
import { filterDevices } from "../utils/deviceUtils";

import AddDeviceForm from "../components/devices/AddDeviceForm";
import DeviceFilters from "../components/devices/DeviceFilters";
import DeviceList from "../components/devices/DeviceList";
import DeviceDetailsPanel from "../components/devices/DeviceDetailsPanel";
import EditDeviceModal from "../components/devices/EditDeviceModal";
import ErrorAlert from "../components/common/ErrorAlert";

export default function MonitorsPage() {
  const dashboard = useDevices();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const types = useMemo(
    () =>
      [...new Set(dashboard.devices.map((device) => device.type).filter(Boolean))].sort(),
    [dashboard.devices],
  );

  const filteredDevices = useMemo(
    () => filterDevices(dashboard.devices, search, status, type),
    [dashboard.devices, search, status, type],
  );

  const onlineCount = dashboard.devices.filter(
    (device) => device.status.toLowerCase() === "online",
  ).length;

  const offlineCount = dashboard.devices.filter(
    (device) => device.status.toLowerCase() === "offline",
  ).length;

  const averageLatency = useMemo(() => {
    const values = dashboard.devices
      .map((device) => device.latency)
      .filter((value): value is number => value !== null && Number.isFinite(value));

    return values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : null;
  }, [dashboard.devices]);

  function clearFilters() {
    setSearch("");
    setStatus("All");
    setType("All");
  }

  function handleDelete(device: Device) {
    void dashboard.remove(device, selectedDevice?.id ?? "", () => {
      setSelectedDevice(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Activity className="text-sky-400" size={24} />
            Monitors
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage monitored websites, APIs, and network endpoints.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void dashboard.fetchDashboard(true)}
          disabled={dashboard.refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-sky-500/50 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={dashboard.refreshing ? "animate-spin" : ""}
          />
          {dashboard.refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <ErrorAlert
        message={dashboard.error}
        onDismiss={() => dashboard.setError("")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total monitors"
          value={dashboard.devices.length}
          description="Configured endpoints"
          icon={<Server size={19} />}
          tone="sky"
        />
        <StatCard
          title="Online"
          value={onlineCount}
          description="Currently responding"
          icon={<Wifi size={19} />}
          tone="emerald"
        />
        <StatCard
          title="Offline"
          value={offlineCount}
          description="Not responding"
          icon={<WifiOff size={19} />}
          tone="rose"
        />
        <StatCard
          title="Average latency"
          value={averageLatency === null ? "—" : `${averageLatency} ms`}
          description="Across available measurements"
          icon={<Activity size={19} />}
          tone="amber"
        />
      </div>

      <AddDeviceForm adding={dashboard.adding} onAdd={dashboard.add} />

      <section className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Your endpoints</h2>
            <p className="mt-1 text-xs text-slate-400">
              Search, filter, and manage your monitoring devices.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">
            {filteredDevices.length} of {dashboard.devices.length}
          </span>
        </div>

        <DeviceFilters
          search={search}
          status={status}
          type={type}
          types={types}
          onSearch={setSearch}
          onStatus={setStatus}
          onType={setType}
          onClear={clearFilters}
        />

        <DeviceList
          devices={filteredDevices}
          total={dashboard.devices.length}
          loading={dashboard.loading}
          checkingDevice={dashboard.checkingDevice}
          deletingDevice={dashboard.deletingDevice}
          savingEdit={dashboard.savingEdit}
          onEdit={setEditingDevice}
          onCheck={(device) => void dashboard.check(device)}
          onDelete={handleDelete}
        />

        {filteredDevices.length > 0 && (
          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Inspect a monitor
            </p>
            <select
              aria-label="Choose a monitor to inspect"
              value={selectedDevice?.id ?? ""}
              onChange={(event) => {
                const device = dashboard.devices.find(
                  (item) => item.id === event.target.value,
                );
                setSelectedDevice(device ?? null);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-sky-500 sm:max-w-md"
            >
              <option value="">Select a device to view details...</option>
              {dashboard.devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {selectedDevice &&
        dashboard.devices.some((device) => device.id === selectedDevice.id) && (
          <DeviceDetailsPanel
            device={
              dashboard.devices.find((device) => device.id === selectedDevice.id)!
            }
            history={dashboard.history}
            onClose={() => setSelectedDevice(null)}
          />
        )}

      <EditDeviceModal
        device={editingDevice}
        saving={dashboard.savingEdit}
        onClose={() => setEditingDevice(null)}
        onSave={async (device, details) => {
          const saved = await dashboard.update(device, details);
          if (saved) setEditingDevice(null);
          return saved;
        }}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  tone: "sky" | "emerald" | "rose" | "amber";
}) {
  const tones = {
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  };

  return (
    <article className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0a1423] p-4 transition hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>
        <div className={`rounded-xl border p-2.5 ${tones[tone]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </article>
  );
}
