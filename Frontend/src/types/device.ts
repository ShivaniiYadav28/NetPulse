export interface Device {
  id: string;
  name: string;
  address: string;
  type: string;
  status: string;
  latency: number | null;
  httpStatus: number | null;
  checkedAt: string | null;
  error?: string | null;
}

export interface HistoryPoint {
  deviceId: string;
  name: string;
  status: string;
  latency: number | null;
  httpStatus: number | null;
  checkedAt: string | null;
  error?: string | null;
}

export type DeviceDetails = Pick<Device, "name" | "address" | "type">;
