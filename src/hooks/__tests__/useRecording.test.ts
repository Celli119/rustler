import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecording } from "../useRecording";
import { useAppStore } from "@/stores/appStore";
import { mockInvoke, resetMocks } from "@/test/mocks/tauri";

describe("useRecording", () => {
  beforeEach(() => {
    resetMocks();
    useAppStore.setState({
      isRecording: false,
      isProcessing: false,
      transcription: null,
    });
  });

  it("returns initial recording state as false", () => {
    const { result } = renderHook(() => useRecording());

    expect(result.current.isRecording).toBe(false);
  });

  it("returns initial processing state as false", () => {
    const { result } = renderHook(() => useRecording());

    expect(result.current.isProcessing).toBe(false);
  });

  it("returns initial transcription as null", () => {
    const { result } = renderHook(() => useRecording());

    expect(result.current.transcription).toBeNull();
  });

  it("provides startRecording function", () => {
    const { result } = renderHook(() => useRecording());

    expect(typeof result.current.startRecording).toBe("function");
  });

  it("provides stopRecording function", () => {
    const { result } = renderHook(() => useRecording());

    expect(typeof result.current.stopRecording).toBe("function");
  });

  it("startRecording calls invoke", async () => {
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(mockInvoke).toHaveBeenCalledWith("start_recording");
  });

  it("stopRecording calls invoke for stop and transcribe", async () => {
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(mockInvoke).toHaveBeenCalledWith("stop_recording");
    expect(mockInvoke).toHaveBeenCalledWith("get_settings");
    expect(mockInvoke).toHaveBeenCalledWith("transcribe_audio", expect.any(Object));
  });

  it("handles startRecording error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInvoke.mockImplementation((command: string) => {
      if (command === "start_recording") {
        return Promise.reject(new Error("Recording failed"));
      }
      return Promise.resolve();
    });

    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to start recording:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("handles stopRecording error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInvoke.mockImplementation((command: string) => {
      if (command === "stop_recording") {
        return Promise.reject(new Error("Stop failed"));
      }
      return Promise.resolve();
    });

    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to stop/transcribe:", expect.any(Error));
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    consoleSpy.mockRestore();
  });
});
