import { useState } from "react";
import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import { useRecordingState } from "@/hooks/useRecordingState";

// Set transparent background for overlay window
if (typeof document !== "undefined") {
  document.body.style.background = "transparent";
  document.documentElement.style.background = "transparent";
}

/**
 * Floating overlay button that lives in a separate transparent window.
 * This button allows users to start/stop recording from anywhere on their screen.
 */
export function OverlayButton() {
  const { state, toggleRecording } = useRecordingState();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.screenX, y: e.screenY });
  };

  const handleMouseMove = async (e: React.MouseEvent) => {
    if (isDragging) {
      const appWindow = getCurrentWindow();
      const deltaX = e.screenX - dragStart.x;
      const deltaY = e.screenY - dragStart.y;
      setDragStart({ x: e.screenX, y: e.screenY });

      const pos = await appWindow.outerPosition();
      await appWindow.setPosition(new PhysicalPosition(pos.x + deltaX, pos.y + deltaY));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = async () => {
    // Only trigger if not dragging
    if (!isDragging) {
      await toggleRecording();
    }
  };

  // Get button styling based on state
  const getStateStyles = () => {
    switch (state) {
      case "recording":
        return {
          bg: "bg-red-500",
          shadow: "shadow-red-500/50",
          animate: "animate-pulse",
        };
      case "processing":
        return {
          bg: "bg-blue-500",
          shadow: "shadow-blue-500/50",
          animate: "",
        };
      case "done":
        return {
          bg: "bg-green-500",
          shadow: "shadow-green-500/50",
          animate: "",
        };
      default:
        return {
          bg: "bg-gray-800 hover:bg-gray-700",
          shadow: "shadow-gray-800/50",
          animate: "",
        };
    }
  };

  const styles = getStateStyles();

  return (
    <div
      className="flex items-center justify-center"
      style={{ background: "transparent", width: "100vw", height: "100vh", margin: 0, padding: 0 }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <button
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        disabled={state === "processing"}
        className={`
          w-14 h-14
          rounded-full
          ${styles.bg}
          ${styles.animate}
          shadow-lg ${styles.shadow}
          flex items-center justify-center
          text-white
          transition-all duration-200
          cursor-pointer
          border-2 border-white/20
          disabled:cursor-not-allowed
          hover:scale-110
          active:scale-95
        `}
      >
        {state === "processing" ? (
          <svg className="w-7 h-7 animate-spin" fill="none" viewBox="0 0 24 24">
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : state === "recording" ? (
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : state === "done" ? (
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
