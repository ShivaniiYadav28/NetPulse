
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AppLayout from "./components/layouts/AppLayout";

import OverviewPage from "./pages/OverviewPage";
import MonitorsPage from "./pages/MonitorsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import IncidentsPage from "./pages/IncidentsPage";
import AlertsPage from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Main dashboard */}
          <Route index element={<OverviewPage />} />

          {/* Device management */}
          <Route
            path="monitors"
            element={<MonitorsPage />}
          />

          {/* Analytics and monitoring reports */}
          <Route
            path="analytics"
            element={<AnalyticsPage />}
          />

          {/* Outage and recovery records */}
          <Route
            path="incidents"
            element={<IncidentsPage />}
          />

          {/* Notification configuration */}
          <Route
            path="alerts"
            element={<AlertsPage />}
          />

          {/* Application preferences */}
          <Route
            path="settings"
            element={<SettingsPage />}
          />

          {/* Redirect unknown routes to Overview */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
