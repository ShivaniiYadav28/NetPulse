import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../auth/AuthProvider";
import {
  DISPLAY_PREFERENCES_EVENT,
  DISPLAY_PREFERENCES_KEY,
  loadDisplayPreferences,
} from "../../utils/displayPreferences";

function getWorkspaceName(): string {
  const name = loadDisplayPreferences().workspaceName.trim();
  return name || "NetPulse Workspace";
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(getWorkspaceName);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setWorkspaceName(getWorkspaceName());
  }, [location.pathname]);

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === DISPLAY_PREFERENCES_KEY || event.key === null) {
        setWorkspaceName(getWorkspaceName());
      }
    }
    function handlePreferencesChange() {
      setWorkspaceName(getWorkspaceName());
    }

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(DISPLAY_PREFERENCES_EVENT, handlePreferencesChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(DISPLAY_PREFERENCES_EVENT, handlePreferencesChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#070e19] text-slate-100">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-800 bg-[#070e19]/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 lg:hidden"
          >
            <Menu size={20} />
          </button>

          <span
            className="min-w-0 truncate text-sm text-slate-300"
            title={workspaceName}
          >
            {workspaceName}
          </span>

          {user && (
            <span className="ml-auto max-w-[45%] truncate text-sm text-slate-400">
              {user.displayName}
            </span>
          )}
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
