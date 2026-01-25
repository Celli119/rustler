import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { useRecording } from "@/hooks/useRecording";

/**
 * A floating, draggable button for toggling voice recording.
 * - Always visible in the app
 * - Shows different states: idle, recording, processing, done
 * - Can be dragged to any position
 * - Clicking toggles recording on/off
 */
export function FloatingRecordButton() {
  const { isRecording, isProcessing, transcription } = useAppStore();
  const { startRecording, stopRecording } = useRecording();

  // Use right/bottom positioning for initial placement
  const [useRightBottom, setUseRightBottom] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showDoneState, setShowDoneState] = useState(false);

  // Show "done" state briefly after transcription completes
  useEffect(() => {
    if (transcription && !isRecording && !isProcessing) {
      setShowDoneState(true);
      const timer = setTimeout(() => setShowDoneState(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [transcription, isRecording, isProcessing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent drag when clicking the button
    if ((e.target as HTMLElement).closest("button")) return;

    // Switch from right/bottom to left/top positioning when dragging starts
    if (useRightBottom) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setPosition({ x: rect.left, y: rect.top });
      setUseRightBottom(false);
    }

    setIsDragging(true);
    setDragOffset({
      x:
        e.clientX -
        (useRightBottom
          ? (e.currentTarget as HTMLElement).getBoundingClientRect().left
          : position.x),
      y:
        e.clientY -
        (useRightBottom
          ? (e.currentTarget as HTMLElement).getBoundingClientRect().top
          : position.y),
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

  const handleClick = async () => {
    if (isProcessing) return; // Don't allow interaction while processing

    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  // Determine button appearance based on state
  const getButtonConfig = () => {
    if (isProcessing) {
      return {
        bg: "bg-blue-500 hover:bg-blue-600",
        ring: "ring-blue-300",
        icon: (
          <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ),
        tooltip: "Processing...",
      };
    }

    if (isRecording) {
      return {
        bg: "bg-red-500 hover:bg-red-600",
        ring: "ring-red-300",
        icon: (
          <svg className="w-8 h-8 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ),
        tooltip: "Click to stop recording",
      };
    }

    if (showDoneState) {
      return {
        bg: "bg-green-500 hover:bg-green-600",
        ring: "ring-green-300",
        icon: (
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
        tooltip: "Transcription complete!",
      };
    }

    // Idle state
    return {
      bg: "bg-gray-700 hover:bg-gray-600",
      ring: "ring-gray-500",
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      ),
      tooltip: "Click to start recording",
    };
  };

  const config = getButtonConfig();

  return (
    <div
      className="fixed z-[9999]"
      style={
        useRightBottom
          ? {
              right: "24px",
              bottom: "24px",
              pointerEvents: "auto",
            }
          : {
              left: `${position.x}px`,
              top: `${position.y}px`,
              pointerEvents: "auto",
            }
      }
      onMouseDown={handleMouseDown}
    >
      {/* Drag handle area */}
      <div className="cursor-move p-1 -m-1">
        <button
          onClick={handleClick}
          disabled={isProcessing}
          className={`
            ${config.bg}
            w-16 h-16
            rounded-full
            shadow-lg
            flex items-center justify-center
            text-white
            transition-all duration-200
            ring-4 ${config.ring}
            ${isRecording ? "animate-pulse" : ""}
            ${isDragging ? "scale-110" : "hover:scale-105"}
            focus:outline-none focus:ring-offset-2
            disabled:cursor-not-allowed
          `}
          title={config.tooltip}
        >
          {config.icon}
        </button>
      </div>

      {/* Status label below button */}
      {(isRecording || isProcessing) && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2">
          <span
            className={`
              px-3 py-1 rounded-full text-xs font-medium text-white shadow-md
              ${isRecording ? "bg-red-500" : "bg-blue-500"}
            `}
          >
            {isRecording ? "Recording..." : "Processing..."}
          </span>
        </div>
      )}
    </div>
  );
}
