import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getDevices = async () =>
  (await api.get<{ devices?: import("../types/device").Device[] }>("/devices")).data
    .devices ?? [];

export const getDeviceHistory = async (id: string) =>
  (
    await api.get<{ history?: import("../types/device").HistoryPoint[] }>(
      `/devices/${encodeURIComponent(id)}/history`,
    )
  ).data.history ?? [];

export const addDevice = (
  device: Pick<import("../types/device").Device, "name" | "address" | "type">,
) => api.post("/devices", device);

export const updateDevice = (
  id: string,
  device: Pick<import("../types/device").Device, "name" | "address" | "type">,
) => api.put(`/devices/${encodeURIComponent(id)}`, device);

export const deleteDevice = (id: string) =>
  api.delete(`/devices/${encodeURIComponent(id)}`);

export const checkDevice = (id: string) =>
  api.post(`/devices/${encodeURIComponent(id)}/check`);

export { axios };
