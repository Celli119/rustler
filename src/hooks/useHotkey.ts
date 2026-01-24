import { useState, useCallback, useEffect } from "react";

export function useHotkey() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordedKeys([]);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const formatHotkey = useCallback((keys: string[]): string => {
    if (keys.length === 0) return "";

    const modifiers: string[] = [];
    const regularKeys: string[] = [];

    const modifierMap: Record<string, string> = {
      Control: "Ctrl",
      Meta: "Super",
      Alt: "Alt",
      Shift: "Shift",
    };

    keys.forEach((key) => {
      if (key in modifierMap) {
        modifiers.push(modifierMap[key]);
      } else if (key.length === 1) {
        regularKeys.push(key.toUpperCase());
      } else if (key === " ") {
        regularKeys.push("Space");
      } else {
        regularKeys.push(key);
      }
    });

    return [...modifiers, ...regularKeys].join("+");
  }, []);

  const validateHotkey = useCallback((hotkey: string): boolean => {
    // Must have at least one modifier and one key
    const parts = hotkey.split("+");
    const hasModifier = parts.some((p) =>
      ["Ctrl", "Alt", "Shift", "Super"].includes(p)
    );
    const hasKey = parts.some(
      (p) => !["Ctrl", "Alt", "Shift", "Super"].includes(p)
    );
    return hasModifier && hasKey && parts.length >= 2;
  }, []);

  // Handle keyboard events when recording
  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      const keys: string[] = [];

      if (event.ctrlKey) keys.push("Control");
      if (event.altKey) keys.push("Alt");
      if (event.shiftKey) keys.push("Shift");
      if (event.metaKey) keys.push("Meta");

      // Add the actual key if it's not a modifier
      if (!["Control", "Alt", "Shift", "Meta"].includes(event.key)) {
        keys.push(event.key);
      }

      setRecordedKeys(keys);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording]);

  const getHotkeyString = useCallback(() => {
    return formatHotkey(recordedKeys);
  }, [recordedKeys, formatHotkey]);

  return {
    isRecording,
    recordedKeys,
    startRecording,
    stopRecording,
    formatHotkey,
    validateHotkey,
    getHotkeyString,
  };
}
