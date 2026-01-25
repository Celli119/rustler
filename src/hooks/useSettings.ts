import { useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import { getSettings, saveSettings, registerHotkey, isWaylandSession, resetWaylandHotkey } from "@/lib/tauri";
import type { Settings } from "@/lib/tauri";

// Module-level flag to prevent duplicate hotkey registration across all hook instances
let hotkeyRegistered = false;

export function useSettings() {
  const { settings, setSettings } = useAppStore();

  // Load settings on mount and auto-register hotkey
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Backend caches settings, so this is fast after first call
        const loadedSettings = await getSettings();
        setSettings(loadedSettings);

        // Auto-register hotkey on startup (only once globally)
        // On Wayland, this may show a system dialog - run in background to avoid blocking UI
        if (loadedSettings.hotkey && !hotkeyRegistered) {
          hotkeyRegistered = true;
          // Fire and forget - don't block UI for hotkey registration
          registerHotkey(loadedSettings.hotkey)
            .then(() => console.log("Hotkey auto-registered:", loadedSettings.hotkey))
            .catch((error) => {
              console.error("Failed to auto-register hotkey:", error);
              hotkeyRegistered = false;
            });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };

    loadSettings();
  }, [setSettings]);

  const updateSettings = useCallback(
    async (newSettings: Partial<Settings>) => {
      try {
        const updatedSettings = { ...settings, ...newSettings };
        await saveSettings(updatedSettings);
        setSettings(updatedSettings);
      } catch (error) {
        console.error("Failed to save settings:", error);
      }
    },
    [settings, setSettings]
  );

  const updateHotkey = useCallback(
    async (hotkey: string) => {
      try {
        hotkeyRegistered = true;

        // On Wayland, use resetWaylandHotkey to force the dialog to appear
        const isWayland = await isWaylandSession();
        if (isWayland) {
          console.log("Wayland detected, using resetWaylandHotkey to show portal dialog");
          await resetWaylandHotkey(hotkey);
        } else {
          await registerHotkey(hotkey);
        }

        await updateSettings({ hotkey });
      } catch (error) {
        console.error("Failed to update hotkey:", error);
        hotkeyRegistered = false;
        throw error;
      }
    },
    [updateSettings]
  );

  return {
    settings,
    updateSettings,
    updateHotkey,
  };
}
