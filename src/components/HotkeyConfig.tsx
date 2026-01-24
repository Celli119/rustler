import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useHotkey } from "@/hooks/useHotkey";
import { useSettings } from "@/hooks/useSettings";

export function HotkeyConfig() {
  const { settings, updateHotkey } = useSettings();
  const {
    isRecording,
    startRecording,
    stopRecording,
    getHotkeyString,
    validateHotkey,
  } = useHotkey();
  const [error, setError] = useState<string | null>(null);

  const handleRecordClick = () => {
    if (isRecording) {
      const hotkey = getHotkeyString();
      if (validateHotkey(hotkey)) {
        stopRecording();
        handleSave(hotkey);
      } else {
        setError("Invalid hotkey combination. Must include at least one modifier (Ctrl/Alt/Shift) and one key.");
        stopRecording();
      }
    } else {
      setError(null);
      startRecording();
    }
  };

  const handleSave = async (hotkey: string) => {
    try {
      await updateHotkey(hotkey);
      setError(null);
    } catch (err) {
      setError("Failed to register hotkey. Please try a different combination.");
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Recording Hotkey
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-2 border rounded-md bg-muted">
            <code className="text-sm">
              {isRecording ? getHotkeyString() || "Press keys..." : settings.hotkey}
            </code>
          </div>
          <Button
            onClick={handleRecordClick}
            variant={isRecording ? "destructive" : "default"}
          >
            {isRecording ? "Stop Recording" : "Record Hotkey"}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Click "Record Hotkey" and press your desired key combination
        </p>
      </div>
    </div>
  );
}
