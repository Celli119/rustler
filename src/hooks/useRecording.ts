import { useAppStore } from "@/stores/appStore";
import { useHistoryStore } from "@/stores/historyStore";
import {
  startRecording as tauriStartRecording,
  stopRecording as tauriStopRecording,
  transcribeAudio,
  getSettings,
  pasteText,
} from "@/lib/tauri";

/**
 * Recording hook for manual recording controls in the RecordingTab.
 * Provides start/stop functions for the manual recording button.
 *
 * Note: Hotkey handling and status event listening is done globally
 * by useHotkeyListener in AppLayout.
 */
export function useRecording() {
  const {
    isRecording,
    isProcessing,
    transcription,
    setRecording,
    setProcessing,
  } = useAppStore();

  const { addToHistory } = useHistoryStore();

  // Manual start recording
  const handleStartRecording = async () => {
    try {
      await tauriStartRecording();
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  // Manual stop recording with transcription
  const handleStopRecording = async () => {
    try {
      // Stop recording
      const audioPath = await tauriStopRecording();
      console.log("Recording stopped, audio file:", audioPath);

      // Get settings for model
      const settings = await getSettings();
      console.log("Using model:", settings.model);

      // Transcribe the audio
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

  return {
    isRecording,
    isProcessing,
    transcription,
    startRecording: handleStartRecording,
    stopRecording: handleStopRecording,
  };
}
