import { Globe, Pencil, RefreshCw, Trash2 } from "lucide-react";
import type { Device } from "../../types/device";
import { buttonSecondary } from "../common/ui";

export default function DeviceCard({
  device,
  checking,
  deleting,
  savingEdit,
  compactCards = false,
  onEdit,
  onCheck,
  onDelete,
}: {
  device: Device;
  checking: boolean;
  deleting: boolean;
  savingEdit: boolean;
  compactCards?: boolean;
  onEdit: () => void;
  onCheck: () => void;
  onDelete: () => void;
}) {
  const online = device.status === "Online";
  const offline = device.status === "Offline";
  const statusClass = online
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
    : offline
      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
      : "border-slate-600 bg-slate-700/50 text-slate-300";
  const dotClass = online
    ? "bg-emerald-400"
    : offline
      ? "bg-rose-400"
      : "bg-slate-400";
  return (
    <article
      className={`min-w-0 rounded-xl border border-slate-700/80 bg-slate-800/40 transition hover:border-sky-500/40 ${compactCards ? "p-3" : "p-3.5 sm:p-4"}`}
    >
      <div className={`flex items-start ${compactCards ? "gap-2" : "gap-3"}`}>
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/5 text-violet-400 ${compactCards ? "h-9 w-9" : "h-10 w-10"}`}
        >
          <Globe size={compactCards ? 18 : 20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-semibold text-slate-100">
              {device.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
              {device.status || "Unknown"}
            </span>
          </div>
          <a
            href={device.address}
            target="_blank"
            rel="noreferrer"
            className={`${compactCards ? "mt-0.5" : "mt-1"} block break-all text-xs text-sky-300 hover:text-sky-200`}
          >
            {device.address}
          </a>
          <p
            className={`${compactCards ? "mt-1" : "mt-2"} text-[11px] text-slate-400`}
          >
            {device.type}
            {device.httpStatus !== null ? ` · HTTP ${device.httpStatus}` : ""}
          </p>
          {device.error && (
            <p className="mt-1 break-words text-[11px] text-rose-300">{device.error}</p>
          )}
          {device.checkedAt && (
            <p
              className={`${compactCards ? "mt-1" : "mt-1.5"} text-[11px] text-slate-500`}
            >
              Last checked: {new Date(device.checkedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <strong className="text-sm font-bold text-amber-400">
            {device.latency === null ? "—" : `${Math.round(device.latency)} ms`}
          </strong>
          <p className="mt-0.5 text-[10px] text-slate-400">Latency</p>
        </div>
      </div>
      <div
        className={`flex justify-end gap-2 border-t border-slate-700/60 ${compactCards ? "mt-2 pt-2" : "mt-3 pt-3"}`}
      >
        <button
          className={`${buttonSecondary} h-9 w-9 p-0 text-sky-300`}
          title={`Edit ${device.name}`}
          aria-label={`Edit ${device.name}`}
          disabled={savingEdit || deleting || checking}
          onClick={onEdit}
        >
          <Pencil size={15} />
        </button>
        <button
          className={`${buttonSecondary} h-9 w-9 p-0 text-sky-300`}
          title={`Check ${device.name} now`}
          aria-label={`Check ${device.name} now`}
          disabled={checking || deleting}
          onClick={onCheck}
        >
          <RefreshCw size={15} className={checking ? "animate-spin" : ""} />
        </button>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          title={`Delete ${device.name}`}
          aria-label={`Delete ${device.name}`}
          disabled={deleting || checking}
          onClick={onDelete}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
