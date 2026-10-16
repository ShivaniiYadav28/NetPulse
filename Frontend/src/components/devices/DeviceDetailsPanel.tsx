import type { Device, HistoryPoint } from "../../types/device";

type DeviceDetailsPanelProps = {
  device: Device;
  history?: HistoryPoint[];
  onClose: () => void;
};

function DeviceDetailsPanel({
  device,
  history = [],
  onClose,
}: DeviceDetailsPanelProps) {
  const deviceHistory = history
    .filter((point) => point.deviceId === device.id)
    .sort(
      (a, b) =>
        new Date(b.checkedAt ?? 0).getTime() - new Date(a.checkedAt ?? 0).getTime(),
    )
    .slice(0, 10);

  const isOnline = device.status.toLowerCase() === "online";

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
            Device Details
          </p>

          <h2 className="text-xl font-bold text-white">{device.name}</h2>

          <p className="mt-2 break-all text-sm text-slate-400">{device.address}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          Close
        </button>
      </div>

      {/* Current Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-sm text-slate-400">Current Status</p>

          <p
            className={`mt-2 text-xl font-bold ${
              isOnline ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {device.status}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-sm text-slate-400">Response Time</p>

          <p className="mt-2 text-xl font-bold text-white">
            {device.latency != null ? `${device.latency} ms` : "Not available"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-sm text-slate-400">HTTP Status</p>

          <p className="mt-2 text-xl font-bold text-white">
            {device.httpStatus ?? "Not available"}
          </p>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <p className="text-sm text-slate-400">Last Checked</p>

          <p className="mt-2 text-sm text-white">
            {device.checkedAt
              ? new Date(device.checkedAt).toLocaleString()
              : "Never checked"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <p className="text-sm text-slate-400">Device Type</p>

          <p className="mt-2 text-sm text-white">{device.type || "Not specified"}</p>
        </div>
      </div>

      {/* Latest Error */}
      {device.error && (
        <div className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-4">
          <p className="text-sm font-semibold text-red-300">Latest Error</p>

          <p className="mt-2 break-words text-sm text-red-200">{device.error}</p>
        </div>
      )}

      {/* Recent Monitoring History */}
      <div className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white">
              Recent Monitoring History
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Latest recorded checks for this device
            </p>
          </div>

          <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
            {deviceHistory.length} records
          </span>
        </div>

        {deviceHistory.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
            <p className="text-sm text-slate-300">
              No monitoring history available yet.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Recorded checks will appear here when history data is available.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Checked At</th>

                  <th className="px-4 py-3 font-medium">Status</th>

                  <th className="px-4 py-3 font-medium">Latency</th>

                  <th className="px-4 py-3 font-medium">HTTP</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {deviceHistory.map((point, index) => {
                  const pointIsOnline = point.status.toLowerCase() === "online";

                  return (
                    <tr
                      key={`${point.deviceId}-${point.checkedAt ?? "unknown"}-${index}`}
                      className="transition hover:bg-slate-800/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {point.checkedAt
                          ? new Date(point.checkedAt).toLocaleString()
                          : "Not available"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            pointIsOnline
                              ? "bg-emerald-400/10 text-emerald-400"
                              : "bg-red-400/10 text-red-400"
                          }`}
                        >
                          {point.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {point.latency != null ? `${point.latency} ms` : "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {point.httpStatus ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default DeviceDetailsPanel;
