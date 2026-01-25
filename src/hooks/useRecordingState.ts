import { useEffect, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  startRecording as startRecordingCmd,
  stopRecording as stopRecordingCmd,
  transcribeAudio,
  getSettings,
  pasteText,
} from "@/lib/tauri";
import { useHistoryStore } from "@/stores/historyStore";

export type RecordingState = "idle" | "recording" | "processing" | "done";

/**
 * Hook that provides recording state based on backend events.
 * This is the single source of truth for recording state.
 * Both the main window and overlay should use this hook.
 */
export function useRecordingState() {
  const [state, setState] = useState<RecordingState>("idle");
  const [transcription, setTranscription] = useState<string | null>(null);
  const { addToHistory } = useHistoryStore();

  // Listen to backend events
  useEffect(() => {
    let mounted = true;

    const setupListeners = async () => {
      const unlistenRecording = await listen<{ isRecording: boolean }>(
        "recording-status",
        (event) => {
          if (!mounted) return;
          console.log("recording-status:", event.payload);
          if (event.payload.isRecording) {
            setState("recording");
          }
          // When recording stops, we wait for processing-status
        },
      );

      const unlistenProcessing = await listen<{ isProcessing: boolean }>(
        "processing-status",
        (event) => {
          if (!mounted) return;
          console.log("processing-status:", event.payload);
          if (event.payload.isProcessing) {
            setState("processing");
          }
          // When processing stops, we wait for transcription-complete
        },
      );

      const unlistenTranscription = await listen<{ text: string }>(
        "transcription-complete",
        (event) => {
          if (!mounted) return;
          console.log("transcription-complete:", event.payload);
          setTranscription(event.payload.text);
          setState("done");
          // Auto-reset to idle after 2 seconds
          setTimeout(() => {
            if (mounted) setState("idle");
          }, 2000);
        },
      );

      return () => {
        mounted = false;
        unlistenRecording();
        unlistenProcessing();
        unlistenTranscription();
      };
    };

    const cleanup = setupListeners();
    return () => {
      cleanup.then((fn) => fn());
    };
  }, []);

  // Start recording - just calls backend, state updates via events
  const startRecording = useCallback(async () => {
    try {
      await startRecordingCmd();
    } catch (error) {
      console.error("Failed to start recording:", error);
      setState("idle");
    }
  }, []);

  // Stop recording and transcribe - full flow
  const stopAndTranscribe = useCallback(async () => {
    try {
      // Stop recording
      const audioPath = await stopRecordingCmd();
      console.log("Recording stopped, audio file:", audioPath);

      // Get settings for model
      const settings = await getSettings();
      console.log("Using model:", settings.model);

      // Transcribe the audio (this emits processing-status and transcription-complete)
      const text = await transcribeAudio(audioPath, settings.model);
      console.log("Transcription result:", text);

      // Skip blank audio results from Whisper
      const isBlankAudio = !text || !text.trim() || text.includes("[BLANK_AUDIO]");

      // Save to history (skip blank audio)
      if (!isBlankAudio) {
        await addToHistory(text, undefined, settings.model);
      }

      // Auto-paste the transcribed text (skip blank audio)
      if (!isBlankAudio) {
        try {
          await pasteText(text);
        } catch (error) {
          console.error("Failed to paste text:", error);
        }
      }
    } catch (error) {
      console.error("Failed to stop/transcribe:", error);
      setState("idle");
    }
  }, [addToHistory]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (state === "recording") {
      await stopAndTranscribe();
    } else if (state === "idle" || state === "done") {
      await startRecording();
    }
  }, [state, startRecording, stopAndTranscribe]);

  return {
    state,
    transcription,
    startRecording,
    stopAndTranscribe,
    toggleRecording,
  };
}
