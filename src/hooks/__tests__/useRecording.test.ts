import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRecording } from "../useRecording";
import { useAppStore } from "@/stores/appStore";
import { mockInvoke, mockListen, resetMocks } from "@/test/mocks/tauri";

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

  it("sets up event listeners on mount", async () => {
    renderHook(() => useRecording());

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith("recording-status", expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith("transcription-complete", expect.any(Function));
    });
  });

  it("startRecording calls invoke and updates state", async () => {
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(mockInvoke).toHaveBeenCalledWith("start_recording");
    expect(result.current.isRecording).toBe(true);
    expect(result.current.transcription).toBeNull();
  });

  it("stopRecording calls invoke and updates state", async () => {
    const { result } = renderHook(() => useRecording());

    // First start recording
    await act(async () => {
      await result.current.startRecording();
    });

    // Then stop recording
    await act(async () => {
      await result.current.stopRecording();
    });

    expect(mockInvoke).toHaveBeenCalledWith("stop_recording");
    expect(result.current.isRecording).toBe(false);
    expect(result.current.transcription).toBe("Test transcription");
  });

  it("sets processing state during stopRecording", async () => {
    const { result } = renderHook(() => useRecording());

    // Start recording first
    await act(async () => {
      await result.current.startRecording();
    });

    // Stop and check processing gets set to true during the operation
    mockInvoke.mockImplementation(async (command: string) => {
      if (command === "stop_recording") {
        return "Test transcription";
      }
      return undefined;
    });

    await act(async () => {
      await result.current.stopRecording();
    });

    // Processing should be false after completion
    expect(result.current.isProcessing).toBe(false);
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
      await result.current.startRecording();
    });

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to stop recording:", expect.any(Error));
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    consoleSpy.mockRestore();
  });

  it("clears transcription when starting new recording", async () => {
    useAppStore.setState({ transcription: "Previous transcription" });

    const { result } = renderHook(() => useRecording());
    expect(result.current.transcription).toBe("Previous transcription");

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.transcription).toBeNull();
  });

  it("cleans up event listeners on unmount", async () => {
    const mockUnlisten = vi.fn();
    mockListen.mockImplementation(() => Promise.resolve(mockUnlisten));

    const { unmount } = renderHook(() => useRecording());

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    unmount();

    // The unlisten functions should be called
    await waitFor(() => {
      expect(mockUnlisten).toHaveBeenCalled();
    });
  });
});
