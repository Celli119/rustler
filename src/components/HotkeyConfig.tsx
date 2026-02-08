import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useHotkey } from "@/hooks/useHotkey";
import { useSettings } from "@/hooks/useSettings";
import { isWaylandSession } from "@/lib/tauri";

export function HotkeyConfig() {
  const { settings, updateHotkey } = useSettings();
  const { isRecording, startRecording, stopRecording, getHotkeyString, validateHotkey } =
    useHotkey();
  const [error, setError] = useState<string | null>(null);
  const [isWayland, setIsWayland] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    isWaylandSession()
      .then(setIsWayland)
      .catch(() => setIsWayland(false));
  }, []);

  const handleRecordClick = () => {
    if (isRecording) {
      const hotkey = getHotkeyString();
      if (validateHotkey(hotkey)) {
        stopRecording();
        handleSave(hotkey);
      } else {
        setError(
          "Invalid hotkey combination. Must include at least one modifier (Ctrl/Alt/Shift) and one key.",
        );
        stopRecording();
      }
    } else {
      setError(null);
      startRecording();
    }
  };

  const handleWaylandConfigure = async () => {
    setError(null);
    setIsConfiguring(true);
    try {
      await updateHotkey(settings.hotkey);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
      setError(`Failed to configure hotkey: ${message}`);
      console.error(err);
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleSave = async (hotkey: string) => {
    try {
      await updateHotkey(hotkey);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
      setError(`Failed to register hotkey: ${message}`);
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Recording Hotkey</label>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-2 border rounded-md bg-muted">
            <code className="text-sm">
              {isRecording ? getHotkeyString() || "Press keys..." : settings.hotkey}
            </code>
          </div>
          {isWayland ? (
            <Button onClick={handleWaylandConfigure} disabled={isConfiguring}>
              {isConfiguring ? "Configuring..." : "Change Hotkey"}
            </Button>
          ) : (
            <Button onClick={handleRecordClick} variant={isRecording ? "destructive" : "default"}>
              {isRecording ? "Stop Recording" : "Record Hotkey"}
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        <p className="text-xs text-muted-foreground mt-2">
          {isWayland
            ? 'Click "Change Hotkey" to open the system shortcut configuration'
            : 'Click "Record Hotkey" and press your desired key combination'}
        </p>
      </div>
    </div>
  );
}
