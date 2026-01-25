import { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/stores/appStore";
import { getSettings, saveSettings, registerHotkey, isWaylandSession, resetWaylandHotkey } from "@/lib/tauri";
import type { Settings } from "@/lib/tauri";

export function useSettings() {
  const { settings, setSettings } = useAppStore();
  // Prevent duplicate hotkey registration (React Strict Mode calls effects twice)
  const hotkeyRegisteredRef = useRef(false);

  // Load settings on mount and auto-register hotkey
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await getSettings();
        setSettings(loadedSettings);

        // Auto-register hotkey on startup (only once)
        if (loadedSettings.hotkey && !hotkeyRegisteredRef.current) {
          hotkeyRegisteredRef.current = true;
          try {
            await registerHotkey(loadedSettings.hotkey);
            console.log("Hotkey auto-registered:", loadedSettings.hotkey);
          } catch (error) {
            console.error("Failed to auto-register hotkey:", error);
            // Reset flag so user can retry
            hotkeyRegisteredRef.current = false;
          }
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
        hotkeyRegisteredRef.current = true;

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
        hotkeyRegisteredRef.current = false;
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
