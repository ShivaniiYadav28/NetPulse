import axios from "axios";

import type { Device, HistoryPoint } from "../types/device";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let csrfToken = "";
let unauthorizedHandler: (() => void) | null = null;

export function setCsrfToken(token: string) {
  csrfToken = token;
}

export function setUnauthorizedHandler(
  handler: (() => void) | null,
) {
  unauthorizedHandler = handler;
}

api.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase() || "get";

  if (csrfToken && !["get", "head", "options"].includes(method)) {
    config.headers.set("X-CSRF-Token", csrfToken);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url || "");
    const pathname = requestUrl.split("?")[0].replace(/\/+$/, "");

    const publicAuthEndpoints = new Set([
      "/auth/login",
      "/auth/register",
      "/auth/me",
      "/auth/logout",
    ]);

    if (
      error.response?.status === 401 &&
      !publicAuthEndpoints.has(pathname)
    ) {
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  },
);

// Device API functions
export const getDevices = async () =>
  (
    await api.get<{ devices?: Device[] }>("/devices")
  ).data.devices ?? [];

export const getDeviceHistory = async (id: string) =>
  (
    await api.get<{ history?: HistoryPoint[] }>(
      `/devices/${encodeURIComponent(id)}/history`,
    )
  ).data.history ?? [];

export const addDevice = (
  device: Pick<Device, "name" | "address" | "type">,
) => api.post("/devices", device);

export const updateDevice = (
  id: string,
  device: Pick<Device, "name" | "address" | "type">,
) =>
  api.put(`/devices/${encodeURIComponent(id)}`, device);

export const deleteDevice = (id: string) =>
  api.delete(`/devices/${encodeURIComponent(id)}`);

export const checkDevice = (id: string) =>
  api.post(`/devices/${encodeURIComponent(id)}/check`);

// Alert API functions
export const getAlerts = (params?: {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}) => api.get("/alerts", { params });

export const getAlertRules = () => api.get("/alerts/rules");

export const createAlertRule = (rule: {
  name: string;
  deviceId: string;
  type: "MonitorDown" | "HighLatency";
  thresholdMs?: number;
  failureCount?: number;
}) => api.post("/alerts/rules", rule);

export const deleteAlertRule = (id: string) =>
  api.delete(`/alerts/rules/${encodeURIComponent(id)}`);

export const updateAlertRule = (
  id: string,
  rule: {
    name?: string;
    deviceId?: string;
    type?: "MonitorDown" | "HighLatency";
    enabled?: boolean;
    thresholdMs?: number | null;
    failureCount?: number;
  },
) =>
  api.patch(
    `/alerts/rules/${encodeURIComponent(id)}`,
    rule,
  );


// Incident API functions
export const getIncidents = (params?: {
  status?: string;
}) => api.get("/incidents", { params });

// Analytics API functions
export const getAnalyticsOverview = (params?: {
  from?: string;
  to?: string;
}) => api.get("/analytics/overview", { params });

export { axios };
