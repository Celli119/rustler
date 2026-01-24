import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/appStore";
import { useHistoryStore } from "@/stores/historyStore";
import { listen } from "@tauri-apps/api/event";
import {
  startRecording,
  stopRecording,
  transcribeAudio,
  getSettings,
  pasteText,
} from "@/lib/tauri";

/**
 * Main recording hook for the main window.
 * Listens to backend events and handles hotkey triggers.
 */
export function useRecording() {
  const {
    isRecording,
    isProcessing,
    transcription,
    setRecording,
    setProcessing,
    setTranscription,
  } = useAppStore();

  const { addToHistory } = useHistoryStore();

  // Track recording state in a ref for the hotkey callback
  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Full stop and transcribe flow
  const handleStopAndTranscribe = async () => {
    try {
      // Stop recording
      const audioPath = await stopRecording();
      console.log("Recording stopped, audio file:", audioPath);

      // Get settings for model
      const settings = await getSettings();
      console.log("Using model:", settings.model);

      // Transcribe the audio (this emits processing-status and transcription-complete)
      const text = await transcribeAudio(audioPath, settings.model);
      console.log("Transcription result:", text);

      // Save to history
      if (text && text.trim()) {
        await addToHistory(text, undefined, settings.model);
      }

      // Auto-paste the transcribed text
      if (text && text.trim()) {
        try {
          await pasteText(text);
        } catch (error) {
          console.error("Failed to paste text:", error);
        }
      }
    } catch (error) {
      console.error("Failed to stop/transcribe:", error);
      setRecording(false);
      setProcessing(false);
    }
  };

  // Set up event listeners
  useEffect(() => {
    let mounted = true;

    const setupListeners = async () => {
      // Listen to recording status from backend
      const unlistenRecording = await listen<{ isRecording: boolean }>(
        "recording-status",
        (event) => {
          if (!mounted) return;
          console.log("Main: recording-status", event.payload);
          setRecording(event.payload.isRecording);
        }
      );

      // Listen to processing status from backend
      const unlistenProcessing = await listen<{ isProcessing: boolean }>(
        "processing-status",
        (event) => {
          if (!mounted) return;
          console.log("Main: processing-status", event.payload);
          setProcessing(event.payload.isProcessing);
        }
      );

      // Listen to transcription complete from backend
      const unlistenTranscription = await listen<{ text: string }>(
        "transcription-complete",
        (event) => {
          if (!mounted) return;
          console.log("Main: transcription-complete", event.payload);
          setTranscription(event.payload.text);
        }
      );

      // Listen for global hotkey trigger
      const unlistenHotkey = await listen("hotkey-triggered", async () => {
        console.log("Hotkey triggered! isRecording:", isRecordingRef.current);
        if (isRecordingRef.current) {
          await handleStopAndTranscribe();
        } else {
          try {
            await startRecording();
          } catch (error) {
            console.error("Failed to start recording:", error);
          }
        }
      });

      return () => {
        mounted = false;
        unlistenRecording();
        unlistenProcessing();
        unlistenTranscription();
        unlistenHotkey();
      };
    };

    const cleanup = setupListeners();
    return () => {
      cleanup.then((fn) => fn());
    };
  }, [setRecording, setProcessing, setTranscription, addToHistory]);

  // Manual start recording
  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  // Manual stop recording
  const handleStopRecording = async () => {
    await handleStopAndTranscribe();
  };

  return {
    isRecording,
    isProcessing,
    transcription,
    startRecording: handleStartRecording,
    stopRecording: handleStopRecording,
  };
}
