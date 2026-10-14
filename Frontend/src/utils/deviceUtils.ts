import type { Device, HistoryPoint } from "../types/device";

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  averageLatency: number | null;
  uptime: string | null;
}

export function getDeviceStats(
  devices: Device[],
  history: HistoryPoint[],
): DeviceStats {
  const online = devices.filter((device) => device.status === "Online").length;
  const offline = devices.filter((device) => device.status === "Offline").length;
  const latencyValues = devices
    .map((device) => device.latency)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const averageLatency = latencyValues.length
    ? Math.round(
        latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length,
      )
    : null;
  const knownHistory = history.filter(
    (point) => point.status === "Online" || point.status === "Offline",
  );
  const uptime = knownHistory.length
    ? (
        (knownHistory.filter((point) => point.status === "Online").length /
          knownHistory.length) *
        100
      ).toFixed(2)
    : null;
  return { total: devices.length, online, offline, averageLatency, uptime };
}

export function filterDevices(
  devices: Device[],
  query: string,
  status: string,
  type: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  return devices.filter(
    (device) =>
      (device.name.toLowerCase().includes(normalizedQuery) ||
        device.address.toLowerCase().includes(normalizedQuery)) &&
      (status === "All" || device.status === status) &&
      (type === "All" || device.type === type),
  );
}
