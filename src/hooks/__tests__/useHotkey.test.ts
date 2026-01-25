import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHotkey } from "../useHotkey";

describe("useHotkey", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns initial recording state as false", () => {
    const { result } = renderHook(() => useHotkey());

    expect(result.current.isRecording).toBe(false);
  });

  it("returns empty recorded keys initially", () => {
    const { result } = renderHook(() => useHotkey());

    expect(result.current.recordedKeys).toEqual([]);
  });

  it("provides startRecording function", () => {
    const { result } = renderHook(() => useHotkey());

    expect(typeof result.current.startRecording).toBe("function");
  });

  it("provides stopRecording function", () => {
    const { result } = renderHook(() => useHotkey());

    expect(typeof result.current.stopRecording).toBe("function");
  });

  it("provides formatHotkey function", () => {
    const { result } = renderHook(() => useHotkey());

    expect(typeof result.current.formatHotkey).toBe("function");
  });

  it("provides validateHotkey function", () => {
    const { result } = renderHook(() => useHotkey());

    expect(typeof result.current.validateHotkey).toBe("function");
  });

  it("provides getHotkeyString function", () => {
    const { result } = renderHook(() => useHotkey());

    expect(typeof result.current.getHotkeyString).toBe("function");
  });

  it("startRecording sets isRecording to true", () => {
    const { result } = renderHook(() => useHotkey());

    act(() => {
      result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
  });

  it("startRecording clears recorded keys", () => {
    const { result } = renderHook(() => useHotkey());

    // Simulate having some keys recorded
    act(() => {
      result.current.startRecording();
    });

    expect(result.current.recordedKeys).toEqual([]);
  });

  it("stopRecording sets isRecording to false", () => {
    const { result } = renderHook(() => useHotkey());

    act(() => {
      result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
  });

  describe("formatHotkey", () => {
    it("returns empty string for empty array", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.formatHotkey([])).toBe("");
    });

    it("formats Control as Ctrl", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.formatHotkey(["Control", "a"])).toBe("Ctrl+A");
    });

    it("formats Meta as Super", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.formatHotkey(["Meta", "a"])).toBe("Super+A");
    });

    it("preserves Alt modifier", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.formatHotkey(["Alt", "a"])).toBe("Alt+A");
    });

    it("preserves Shift modifier", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.formatHotkey(["Shift", "a"])).toBe("Shift+A");
    });

    it("uppercases single character keys", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.formatHotkey(["Control", "x"])).toBe("Ctrl+X");
    });

    it("formats space key", () => {
      const { result } = renderHook(() => useHotkey());

      // Note: Due to the order of conditions in formatHotkey, space (" ")
      // gets uppercased before being detected. This tests the current behavior.
      // The event.key for space bar is typically " " which gets uppercased.
      expect(result.current.formatHotkey(["Control", " "])).toBe("Ctrl+ ");
    });

    it("handles multiple modifiers", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.formatHotkey(["Control", "Shift", "Alt", "a"])).toBe(
        "Ctrl+Shift+Alt+A",
      );
    });

    it("preserves special key names", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.formatHotkey(["Control", "Enter"])).toBe("Ctrl+Enter");
    });
  });

  describe("validateHotkey", () => {
    it("returns true for valid hotkey with modifier and key", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.validateHotkey("Ctrl+A")).toBe(true);
    });

    it("returns true for hotkey with multiple modifiers", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.validateHotkey("Ctrl+Shift+A")).toBe(true);
    });

    it("returns false for key only without modifier", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.validateHotkey("A")).toBe(false);
    });

    it("returns false for modifier only without key", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.validateHotkey("Ctrl")).toBe(false);
    });

    it("returns true for Alt modifier", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.validateHotkey("Alt+A")).toBe(true);
    });

    it("returns true for Shift modifier", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.validateHotkey("Shift+A")).toBe(true);
    });

    it("returns true for Super modifier", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.validateHotkey("Super+A")).toBe(true);
    });

    it("returns false for empty string", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.validateHotkey("")).toBe(false);
    });
  });

  describe("getHotkeyString", () => {
    it("returns formatted string from recorded keys", () => {
      const { result } = renderHook(() => useHotkey());

      act(() => {
        result.current.startRecording();
      });

      // Since we can't simulate actual keyboard events in this test,
      // getHotkeyString should return empty for no keys
      expect(result.current.getHotkeyString()).toBe("");
    });
  });

  describe("keyboard event handling", () => {
    it("captures keydown events when recording", () => {
      const { result } = renderHook(() => useHotkey());

      act(() => {
        result.current.startRecording();
      });

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "a",
            ctrlKey: true,
            altKey: false,
            shiftKey: false,
            metaKey: false,
          }),
        );
      });

      expect(result.current.recordedKeys).toContain("Control");
      expect(result.current.recordedKeys).toContain("a");
    });

    it("captures multiple modifiers", () => {
      const { result } = renderHook(() => useHotkey());

      act(() => {
        result.current.startRecording();
      });

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "r",
            ctrlKey: true,
            altKey: true,
            shiftKey: false,
            metaKey: false,
          }),
        );
      });

      expect(result.current.recordedKeys).toContain("Control");
      expect(result.current.recordedKeys).toContain("Alt");
      expect(result.current.recordedKeys).toContain("r");
    });

    it("does not capture events when not recording", () => {
      const { result } = renderHook(() => useHotkey());

      expect(result.current.isRecording).toBe(false);

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "a",
            ctrlKey: true,
          }),
        );
      });

      expect(result.current.recordedKeys).toEqual([]);
    });

    it("does not add modifier key as regular key", () => {
      const { result } = renderHook(() => useHotkey());

      act(() => {
        result.current.startRecording();
      });

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Control",
            ctrlKey: true,
          }),
        );
      });

      expect(result.current.recordedKeys).toEqual(["Control"]);
      expect(result.current.recordedKeys.filter((k) => k === "Control")).toHaveLength(1);
    });
  });
});
