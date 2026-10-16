import { useCallback, useEffect, useRef, useState } from "react";
import {
  axios,
  addDevice as postDevice,
  checkDevice as postCheck,
  deleteDevice as removeDevice,
  getDeviceHistory,
  getDevices,
  updateDevice as putDevice,
} from "../services/api";
import type {
  Device,
  DeviceDetails,
  HistoryPoint,
} from "../types/device";

export function useDevices(refreshInterval = 10) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [checkingDevice, setCheckingDevice] = useState("");
  const [deletingDevice, setDeletingDevice] = useState("");
  const [error, setError] = useState("");

  const requestActive = useRef(false);
  const refreshPending = useRef(false);

  const fetchDashboard = useCallback(async (showRefresh = false) => {
    if (requestActive.current) {
      if (showRefresh) {
        refreshPending.current = true;
      }
      return;
    }

    requestActive.current = true;

    if (showRefresh) {
      setRefreshing(true);
    }

    try {
      setError("");

      const deviceList = await getDevices();
      setDevices(deviceList);

      const historyResponses = await Promise.all(
        deviceList.map((device) =>
          getDeviceHistory(device.id).catch(() => [] as HistoryPoint[]),
        ),
      );

      const allHistory = historyResponses
        .flat()
        .filter(
          (point) =>
            point.checkedAt &&
            Number.isFinite(new Date(point.checkedAt).getTime()),
        )
        .sort(
          (a, b) =>
            new Date(a.checkedAt!).getTime() -
            new Date(b.checkedAt!).getTime(),
        );

      setHistory(allHistory);
    } catch {
      setError(
        "Unable to connect to the NetPulse backend. Check your connection and backend configuration.",
      );
    } finally {
      requestActive.current = false;
      setLoading(false);
      setRefreshing(false);

      if (refreshPending.current) {
        refreshPending.current = false;
        queueMicrotask(() => void fetchDashboard(true));
      }
    }
  }, []);

  useEffect(() => {
    const intervalMs = Math.max(1, refreshInterval) * 1000;

    const initialFetch = window.setTimeout(
      () => void fetchDashboard(),
      0,
    );

    const timer = window.setInterval(
      () => void fetchDashboard(),
      intervalMs,
    );

    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(timer);
    };
  }, [fetchDashboard, refreshInterval]);

  const add = useCallback(
    async (details: DeviceDetails) => {
      setAdding(true);
      setError("");

      try {
        await postDevice(details);
        await fetchDashboard(true);
        return true;
      } catch (err) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.message || "Unable to add the device."
            : "Unable to add the device.",
        );
        return false;
      } finally {
        setAdding(false);
      }
    },
    [fetchDashboard],
  );

  const update = useCallback(
    async (device: Device, details: DeviceDetails) => {
      setSavingEdit(true);
      setError("");

      try {
        await putDevice(device.id, details);
        await fetchDashboard(true);
        return true;
      } catch (err) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.message || "Unable to update the device."
            : "Unable to update the device.",
        );
        return false;
      } finally {
        setSavingEdit(false);
      }
    },
    [fetchDashboard],
  );

  const check = useCallback(
    async (device: Device) => {
      setCheckingDevice(device.id);
      setError("");

      try {
        await postCheck(device.id);
        await fetchDashboard(true);
      } catch {
        setError(`Unable to check ${device.name}.`);
      } finally {
        setCheckingDevice("");
      }
    },
    [fetchDashboard],
  );

  const remove = useCallback(
    async (
      device: Device,
      selectedId: string,
      onDeleted: () => void,
    ) => {
      if (
        !window.confirm(
          `Delete "${device.name}" and its monitoring history? This cannot be undone.`,
        )
      ) {
        return;
      }

      setDeletingDevice(device.id);
      setError("");

      try {
        await removeDevice(device.id);

        if (selectedId === device.id) {
          onDeleted();
        }

        await fetchDashboard(true);
      } catch {
        setError(`Unable to delete ${device.name}.`);
      } finally {
        setDeletingDevice("");
      }
    },
    [fetchDashboard],
  );

  return {
    devices,
    history,
    loading,
    refreshing,
    adding,
    savingEdit,
    checkingDevice,
    deletingDevice,
    error,
    setError,
    fetchDashboard,
    add,
    update,
    check,
    remove,
  };
}
