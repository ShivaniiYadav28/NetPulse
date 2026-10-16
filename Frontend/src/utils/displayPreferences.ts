export const DISPLAY_PREFERENCES_KEY = "netpulse-display-preferences";
export const DISPLAY_PREFERENCES_EVENT = "netpulse-display-preferences-changed";

export type DisplayPreferences = {
  workspaceName: string;
  refreshInterval: string;
  compactCards: boolean;
  showOfflineFirst: boolean;
};

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  workspaceName: "NetPulse Workspace",
  refreshInterval: "10",
  compactCards: false,
  showOfflineFirst: true,
};

export function loadDisplayPreferences(): DisplayPreferences {
  try {
    const stored = localStorage.getItem(DISPLAY_PREFERENCES_KEY);
    if (!stored) return DEFAULT_DISPLAY_PREFERENCES;

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_DISPLAY_PREFERENCES;
    }

    const value = parsed as Partial<DisplayPreferences>;
    return {
      workspaceName:
        typeof value.workspaceName === "string"
          ? value.workspaceName.slice(0, 60)
          : DEFAULT_DISPLAY_PREFERENCES.workspaceName,
      refreshInterval: ["10", "30", "60"].includes(
        String(value.refreshInterval),
      )
        ? String(value.refreshInterval)
        : DEFAULT_DISPLAY_PREFERENCES.refreshInterval,
      compactCards:
        typeof value.compactCards === "boolean"
          ? value.compactCards
          : DEFAULT_DISPLAY_PREFERENCES.compactCards,
      showOfflineFirst:
        typeof value.showOfflineFirst === "boolean"
          ? value.showOfflineFirst
          : DEFAULT_DISPLAY_PREFERENCES.showOfflineFirst,
    };
  } catch {
    return DEFAULT_DISPLAY_PREFERENCES;
  }
}

export function saveDisplayPreferences(preferences: DisplayPreferences) {
  localStorage.setItem(DISPLAY_PREFERENCES_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event(DISPLAY_PREFERENCES_EVENT));
}

export function resetDisplayPreferences() {
  localStorage.removeItem(DISPLAY_PREFERENCES_KEY);
  window.dispatchEvent(new Event(DISPLAY_PREFERENCES_EVENT));
}
