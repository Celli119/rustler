import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSettings } from "../useSettings";
import { useAppStore } from "@/stores/appStore";
import { mockInvoke, resetMocks, mockSettings } from "@/test/mocks/tauri";

describe("useSettings", () => {
  beforeEach(() => {
    resetMocks();
    useAppStore.setState({
      settings: { ...mockSettings },
      setSettings: useAppStore.getState().setSettings,
    });
  });

  it("returns current settings from store", () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual(mockSettings);
  });

  it("loads settings on mount", async () => {
    renderHook(() => useSettings());

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_settings");
    });
  });

  it("provides updateSettings function", () => {
    const { result } = renderHook(() => useSettings());

    expect(typeof result.current.updateSettings).toBe("function");
  });

  it("provides updateHotkey function", () => {
    const { result } = renderHook(() => useSettings());

    expect(typeof result.current.updateHotkey).toBe("function");
  });

  it("updateSettings calls saveSettings and updates store", async () => {
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings({ language: "es" });
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({ language: "es" }),
      }));
    });
  });

  it("updateSettings preserves existing settings", async () => {
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings({ useGpu: true });
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
        settings: expect.objectContaining({
          hotkey: "Ctrl+Shift+Space",
          model: "base",
          language: "en",
          useGpu: true,
        }),
      }));
    });
  });

  it("updateHotkey registers hotkey and updates settings", async () => {
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateHotkey("Ctrl+Alt+R");
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("register_hotkey", { shortcut: "Ctrl+Alt+R" });
    });
  });

  it("updateHotkey throws error when registration fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInvoke.mockImplementation((command: string) => {
      if (command === "register_hotkey") {
        return Promise.reject(new Error("Failed to register hotkey"));
      }
      if (command === "get_settings") {
        return Promise.resolve(mockSettings);
      }
      return Promise.resolve();
    });

    const { result } = renderHook(() => useSettings());

    await expect(async () => {
      await act(async () => {
        await result.current.updateHotkey("Invalid+Hotkey");
      });
    }).rejects.toThrow();

    consoleSpy.mockRestore();
  });

  it("handles error when loading settings fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInvoke.mockImplementationOnce(() => Promise.reject(new Error("Load failed")));

    renderHook(() => useSettings());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to load settings:", expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it("handles error when saving settings fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInvoke.mockImplementation((command: string) => {
      if (command === "save_settings") {
        return Promise.reject(new Error("Save failed"));
      }
      return Promise.resolve(mockSettings);
    });

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings({ language: "fr" });
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to save settings:", expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
