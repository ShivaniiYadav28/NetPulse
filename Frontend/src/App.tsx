
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Plus,
  Server,
  Globe,
  AlertCircle,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

type Device = {
  id: string;
  name: string;
  address: string;
  type: string;
  status: string;
  latency: number | null;
  httpStatus: number | null;
  checkedAt: string | null;
  error?: string | null;
};

type HistoryPoint = {
  deviceId: string;
  name: string;
  status: string;
  latency: number | null;
  httpStatus: number | null;
  checkedAt: string;
  error?: string | null;
};

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000,
});

function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("API Endpoint");
  const [adding, setAdding] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState("all");
  const [checkingDevice, setCheckingDevice] = useState("");

  const fetchDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      setError("");

      const response = await api.get("/devices");
      const deviceList: Device[] = response.data.devices ?? [];

      setDevices(deviceList);

      const historyResponses = await Promise.all(
        deviceList.map(async (device) => {
          try {
            const result = await api.get(
              `/devices/${encodeURIComponent(device.id)}/history`
            );

            return (result.data.history ?? []) as HistoryPoint[];
          } catch {
            return [] as HistoryPoint[];
          }
        })
      );

      const allHistory = historyResponses
        .flat()
        .filter(
          (point) =>
            point.checkedAt &&
            Number.isFinite(new Date(point.checkedAt).getTime())
        )
        .sort(
          (a, b) =>
            new Date(a.checkedAt).getTime() -
            new Date(b.checkedAt).getTime()
        );

      setHistory(allHistory);
    } catch {
      setError(
        "Unable to connect to the NetPulse backend. Make sure the backend is running on port 5000."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();

    const timer = window.setInterval(() => {
      void fetchDashboard();
    }, 10000);

    return () => window.clearInterval(timer);
  }, [fetchDashboard]);

  async function handleAddDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !address.trim()) {
      setError("Please enter a device name and URL.");
      return;
    }

    setAdding(true);

    try {
      await api.post("/devices", {
        name: name.trim(),
        address: address.trim(),
        type,
      });

      setName("");
      setAddress("");
      await fetchDashboard(true);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message
        : undefined;

      setError(message || "Unable to add the device.");
    } finally {
      setAdding(false);
    }
  }

  async function handleCheck(device: Device) {
    setCheckingDevice(device.id);
    setError("");

    try {
      await api.post(
        `/devices/${encodeURIComponent(device.id)}/check`
      );

      await fetchDashboard(true);
    } catch {
      setError(`Unable to check ${device.name}.`);
    } finally {
      setCheckingDevice("");
    }
  }

  const onlineCount = devices.filter(
    (device) => device.status === "Online"
  ).length;

  const offlineCount = devices.filter(
    (device) => device.status === "Offline"
  ).length;

  const latencyValues = devices
    .map((device) => device.latency)
    .filter(
      (value): value is number =>
        value !== null && Number.isFinite(value)
    );

  const averageLatency = latencyValues.length
    ? Math.round(
        latencyValues.reduce((total, value) => total + value, 0) /
          latencyValues.length
      )
    : null;

  const chartData = history
    .filter(
      (point) =>
        point.latency !== null &&
        Number.isFinite(point.latency) &&
        (selectedDevice === "all" ||
          point.deviceId === selectedDevice)
    )
    .map((point) => ({
      time: new Date(point.checkedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      timestamp: new Date(point.checkedAt).getTime(),
      latency: point.latency as number,
      device: point.name,
      status: point.status,
    }));

  return (
    <main className="np-app">
      <header className="np-header">
        <div className="np-brand">
          <div className="np-brand-icon">
            <Activity size={24} />
          </div>

          <div>
            <h1>NetPulse</h1>
            <p>Network monitoring dashboard</p>
          </div>
        </div>

        <button
          className="np-button np-button-secondary"
          onClick={() => void fetchDashboard(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "np-spinning" : ""}
          />
          Refresh
        </button>
      </header>

      {error && (
        <div className="np-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <section className="np-stats">
        <article className="np-stat-card">
          <span className="np-stat-label">Total devices</span>
          <Server size={21} />
          <strong>{devices.length}</strong>
          <small>Monitored endpoints</small>
        </article>

        <article className="np-stat-card">
          <span className="np-stat-label">Online</span>
          <Wifi size={21} />
          <strong>{onlineCount}</strong>
          <small>Responding endpoints</small>
        </article>

        <article className="np-stat-card">
          <span className="np-stat-label">Offline</span>
          <WifiOff size={21} />
          <strong>{offlineCount}</strong>
          <small>Unreachable endpoints</small>
        </article>

        <article className="np-stat-card">
          <span className="np-stat-label">Average latency</span>
          <Clock size={21} />
          <strong>
            {averageLatency === null ? "—" : `${averageLatency} ms`}
          </strong>
          <small>Across devices with measurements</small>
        </article>
      </section>

      <section className="np-panel">
        <div className="np-section-heading">
          <div>
            <h2>Latency history</h2>
            <p>Response time from recorded monitoring checks</p>
          </div>

          <select
            value={selectedDevice}
            onChange={(event) => setSelectedDevice(event.target.value)}
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

        {chartData.length > 0 ? (
          <div className="np-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 18, left: 4, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#493044"
                />

                <XAxis
                  dataKey="time"
                  tick={{ fill: "#d6b8d2", fontSize: 11 }}
                  minTickGap={24}
                  axisLine={{ stroke: "#63405d" }}
                  tickLine={{ stroke: "#63405d" }}
                />

                <YAxis
                  unit=" ms"
                  tick={{ fill: "#d6b8d2", fontSize: 11 }}
                  width={65}
                  axisLine={{ stroke: "#63405d" }}
                  tickLine={{ stroke: "#63405d" }}
                />

                <Tooltip
                  contentStyle={{
                    background: "#211321",
                    border: "1px solid #a64d87",
                    borderRadius: 10,
                    color: "#fff1fa",
                  }}
                  labelStyle={{ color: "#f9a8d4" }}
                  formatter={(value, _name, item) => [
                    `${value} ms`,
                    item.payload.device,
                  ]}
                  labelFormatter={(_label, payload) => {
                    const point = payload?.[0]?.payload;
                    return point
                      ? new Date(point.timestamp).toLocaleString()
                      : "";
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="latency"
                  name="Latency"
                  stroke="#f472b6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#f472b6", strokeWidth: 0 }}
                  activeDot={{
                    r: 6,
                    fill: "#f9a8d4",
                    stroke: "#831843",
                    strokeWidth: 2,
                  }}
                  connectNulls={false}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="np-empty-chart">
            <Activity size={30} />
            <strong>No latency history available</strong>
            <p>
              The chart will display recorded measurements after the
              backend returns history with valid latency values.
            </p>
            <button
              className="np-button np-button-secondary"
              onClick={() => void fetchDashboard(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={15}
                className={refreshing ? "np-spinning" : ""}
              />
              Reload history
            </button>
          </div>
        )}
      </section>

      <section className="np-panel">
        <div className="np-section-heading">
          <div>
            <h2>Monitored devices</h2>
            <p>Current endpoint health and response time</p>
          </div>
          <span className="np-count">{devices.length} devices</span>
        </div>

        {loading ? (
          <p className="np-message">Loading devices…</p>
        ) : devices.length === 0 ? (
          <p className="np-message">No devices added yet.</p>
        ) : (
          <div className="np-device-list">
            {devices.map((device) => (
              <article className="np-device-card" key={device.id}>
                <div className="np-device-icon">
                  <Globe size={21} />
                </div>

                <div className="np-device-main">
                  <div className="np-device-title">
                    <h3>{device.name}</h3>
                    <span
                      className={`np-status ${
                        device.status === "Online"
                          ? "np-status-online"
                          : device.status === "Offline"
                            ? "np-status-offline"
                            : "np-status-unknown"
                      }`}
                    >
                      {device.status}
                    </span>
                  </div>

                  <p className="np-device-address">{device.address}</p>

                  <small>
                    {device.type}
                    {device.httpStatus !== null
                      ? ` · HTTP ${device.httpStatus}`
                      : ""}
                  </small>

                  {device.error && (
                    <small className="np-error-text">
                      {device.error}
                    </small>
                  )}

                  {device.checkedAt && (
                    <small>
                      Last checked:{" "}
                      {new Date(device.checkedAt).toLocaleTimeString()}
                    </small>
                  )}
                </div>

                <div className="np-device-latency">
                  <strong>
                    {device.latency === null
                      ? "—"
                      : `${Math.round(device.latency)} ms`}
                  </strong>
                  <small>Latency</small>
                </div>

                <button
                  className="np-icon-button"
                  title={`Check ${device.name} now`}
                  aria-label={`Check ${device.name} now`}
                  disabled={checkingDevice === device.id}
                  onClick={() => void handleCheck(device)}
                >
                  <RefreshCw
                    size={16}
                    className={
                      checkingDevice === device.id ? "np-spinning" : ""
                    }
                  />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="np-panel">
        <div className="np-section-heading">
          <div>
            <h2>Add a device</h2>
            <p>Monitor an endpoint you are authorized to check</p>
          </div>
          <Plus size={21} />
        </div>

        <form className="np-add-form" onSubmit={handleAddDevice}>
          <label>
            Device name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Staging API"
              required
            />
          </label>

          <label>
            Endpoint URL
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="https://example.com"
              type="url"
              required
            />
          </label>

          <label>
            Type
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option>API Endpoint</option>
              <option>Web Server</option>
              <option>Website</option>
              <option>Custom Endpoint</option>
            </select>
          </label>

          <button
            className="np-button np-button-primary"
            type="submit"
            disabled={adding}
          >
            <Plus size={16} />
            {adding ? "Adding…" : "Add device"}
          </button>
        </form>
      </section>

      <footer className="np-footer">
        NetPulse · Network health monitoring
      </footer>
    </main>
  );
}

export default App;
