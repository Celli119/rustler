import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";

type RecordingState = "idle" | "recording" | "processing" | "done";

export function PillOverlay() {
  const { isRecording, isProcessing, transcription } = useAppStore();
  const [state, setState] = useState<RecordingState>("idle");
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isRecording) {
      setState("recording");
    } else if (isProcessing) {
      setState("processing");
    } else if (transcription) {
      setState("done");
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => setState("idle"), 3000);
      return () => clearTimeout(timer);
    } else {
      setState("idle");
    }
  }, [isRecording, isProcessing, transcription]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (state === "idle") return null;

  const getStateConfig = () => {
    switch (state) {
      case "recording":
        return {
          bg: "bg-red-500",
          text: "Recording...",
          icon: "🎙️",
          animate: true,
        };
      case "processing":
        return {
          bg: "bg-blue-500",
          text: "Processing...",
          icon: "⚡",
          animate: true,
        };
      case "done":
        return {
          bg: "bg-green-500",
          text: transcription?.slice(0, 50) + (transcription && transcription.length > 50 ? "..." : ""),
          icon: "✓",
          animate: false,
        };
      default:
        return {
          bg: "bg-gray-500",
          text: "Ready",
          icon: "•",
          animate: false,
        };
    }
  };

  const config = getStateConfig();

  return (
    <div
      className="fixed z-50 cursor-move"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`${config.bg} text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 transition-all duration-300`}
      >
        <span className={config.animate ? "animate-pulse" : ""}>
          {config.icon}
        </span>
        <span className="font-medium text-sm">{config.text}</span>
      </div>
    </div>
  );
}
