import { Globe, Server } from "lucide-react";
import type { Device } from "../../types/device";
import LoadingState from "../common/LoadingState";
import DeviceCard from "./DeviceCard";
export default function DeviceList({
  devices,
  total,
  loading,
  checkingDevice,
  deletingDevice,
  savingEdit,
  onEdit,
  onCheck,
  onDelete,
}: {
  devices: Device[];
  total: number;
  loading: boolean;
  checkingDevice: string;
  deletingDevice: string;
  savingEdit: boolean;
  onEdit: (device: Device) => void;
  onCheck: (device: Device) => void;
  onDelete: (device: Device) => void;
}) {
  if (loading) return <LoadingState label="Loading devices…" />;
  if (!total)
    return (
      <div className="rounded-lg border border-dashed border-slate-700 px-4 py-10 text-center">
        <Server className="mx-auto mb-2 text-slate-500" size={26} />
        <p className="text-sm text-slate-400">
          No devices added yet. Add an endpoint below to start monitoring.
        </p>
      </div>
    );
  if (!devices.length)
    return (
      <div className="rounded-lg border border-dashed border-slate-700 px-4 py-10 text-center">
        <Globe className="mx-auto mb-2 text-slate-500" size={26} />
        <p className="text-sm font-medium text-slate-200">No matching devices found</p>
        <p className="mt-1 text-xs text-slate-400">
          Try another search term or change your filters.
        </p>
      </div>
    );
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {devices.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          checking={checkingDevice === device.id}
          deleting={deletingDevice === device.id}
          savingEdit={savingEdit}
          onEdit={() => onEdit(device)}
          onCheck={() => onCheck(device)}
          onDelete={() => onDelete(device)}
        />
      ))}
    </div>
  );
}
