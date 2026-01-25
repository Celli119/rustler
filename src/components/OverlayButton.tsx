import { useState, useEffect } from "react";
import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useRecordingState } from "@/hooks/useRecordingState";
import { getSettings } from "@/lib/tauri";

// Set transparent background for overlay window
if (typeof document !== "undefined") {
  document.body.style.background = "transparent";
  document.documentElement.style.background = "transparent";
}

// Enable click-through by default so transparent areas don't block clicks
async function setClickThrough(ignore: boolean) {
  try {
    await invoke("set_overlay_ignore_cursor_events", { ignore });
  } catch (e) {
    console.error("Failed to set click-through:", e);
  }
}


/**
 * Animated dune icon component using SVG SMIL for path morphing
 */
function DuneIcon({ isAnimating }: { isAnimating: boolean }) {
  return (
    <svg className="w-full h-full" viewBox="0 0 90 90" fill="none">
      <defs>
        <linearGradient id="duneGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cd7f32" />
          <stop offset="100%" stopColor="#b45328" />
        </linearGradient>
        <linearGradient id="duneGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b45328" />
          <stop offset="100%" stopColor="#8b4513" />
        </linearGradient>
        <linearGradient id="duneGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b4513" />
          <stop offset="100%" stopColor="#6b3410" />
        </linearGradient>
      </defs>

      {/* Back dune layer */}
      <path
        d="M 0 50 Q 15 35, 30 42 Q 50 52, 70 38 Q 85 28, 90 35 L 90 90 L 0 90 Z"
        fill="url(#duneGradient1)"
      >
        {isAnimating && (
          <animate
            attributeName="d"
            dur="3s"
            repeatCount="indefinite"
            values="
              M 0 50 Q 15 35, 30 42 Q 50 52, 70 38 Q 85 28, 90 35 L 90 90 L 0 90 Z;
              M 0 45 Q 20 38, 35 48 Q 55 42, 65 35 Q 80 42, 90 38 L 90 90 L 0 90 Z;
              M 0 48 Q 18 42, 32 38 Q 48 48, 68 42 Q 82 35, 90 42 L 90 90 L 0 90 Z;
              M 0 50 Q 15 35, 30 42 Q 50 52, 70 38 Q 85 28, 90 35 L 90 90 L 0 90 Z
            "
            calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"
          />
        )}
      </path>

      {/* Middle dune layer */}
      <path
        d="M 0 60 Q 20 50, 40 55 Q 60 62, 80 52 Q 88 48, 90 52 L 90 90 L 0 90 Z"
        fill="url(#duneGradient2)"
      >
        {isAnimating && (
          <animate
            attributeName="d"
            dur="2.5s"
            repeatCount="indefinite"
            values="
              M 0 60 Q 20 50, 40 55 Q 60 62, 80 52 Q 88 48, 90 52 L 90 90 L 0 90 Z;
              M 0 58 Q 25 55, 45 50 Q 58 58, 75 55 Q 85 50, 90 55 L 90 90 L 0 90 Z;
              M 0 62 Q 18 48, 38 58 Q 62 55, 78 48 Q 86 55, 90 50 L 90 90 L 0 90 Z;
              M 0 60 Q 20 50, 40 55 Q 60 62, 80 52 Q 88 48, 90 52 L 90 90 L 0 90 Z
            "
            calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"
          />
        )}
      </path>

      {/* Front dune layer */}
      <path
        d="M 0 72 Q 25 65, 45 70 Q 65 76, 90 68 L 90 90 L 0 90 Z"
        fill="url(#duneGradient3)"
      >
        {isAnimating && (
          <animate
            attributeName="d"
            dur="2s"
            repeatCount="indefinite"
            values="
              M 0 72 Q 25 65, 45 70 Q 65 76, 90 68 L 90 90 L 0 90 Z;
              M 0 70 Q 22 72, 42 66 Q 62 72, 90 70 L 90 90 L 0 90 Z;
              M 0 74 Q 28 68, 48 74 Q 68 68, 90 72 L 90 90 L 0 90 Z;
              M 0 72 Q 25 65, 45 70 Q 65 76, 90 68 L 90 90 L 0 90 Z
            "
            calcMode="spline"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"
          />
        )}
      </path>
    </svg>
  );
}

/**
 * Floating overlay button that lives in a separate transparent window.
 * Features a smooth animated dune icon with rusty copper colors.
 */
export function OverlayButton() {
  const { state, toggleRecording } = useRecordingState();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showOnlyDuringRecording, setShowOnlyDuringRecording] = useState(false);

  // Load setting on mount (requires app restart to take effect)
  useEffect(() => {
    setClickThrough(true);
    getSettings().then((settings) => {
      setShowOnlyDuringRecording(settings.showOverlayOnlyDuringRecording);
    });
  }, []);

  // When mouse enters button, disable click-through so button is interactive
  const handleMouseEnter = () => {
    setClickThrough(false);
  };

  // When mouse leaves button, re-enable click-through
  const handleMouseLeave = () => {
    if (!isDragging) {
      setClickThrough(true);
    }
  };

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
    // Re-enable click-through after drag ends
    setClickThrough(true);
  };

  const handleClick = async () => {
    if (!isDragging) {
      await toggleRecording();
    }
  };


  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  // Hide button when not recording/processing if setting is enabled
  const shouldHide = showOnlyDuringRecording && state === "idle";

  // Shadow color based on state
  const shadowColor = isRecording
    ? "rgba(205, 127, 50, 0.7)"
    : "rgba(180, 83, 40, 0.5)";

  return (
    <div
      className="flex items-center justify-center pointer-events-none"
      style={{ background: "transparent", width: "100vw", height: "100vh", margin: 0, padding: 0 }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {!shouldHide && (
        <button
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          disabled={isProcessing}
          className={`
            relative
            w-[70px] h-[70px]
            rounded-full
            overflow-hidden
            transition-all duration-300
            cursor-pointer
            disabled:cursor-not-allowed
            hover:scale-110
            active:scale-95
            pointer-events-auto
            ${isRecording ? "ring-2 ring-orange-400" : ""}
          `}
          style={{
            boxShadow: `0 4px 20px ${shadowColor}, 0 0 0 0.5px rgba(201, 147, 90, 0.5)`,
            background: "linear-gradient(135deg, #c9935a 0%, #d4984f 100%)",
          }}
        >
          <DuneIcon isAnimating={isRecording} />
        </button>
      )}
    </div>
  );
}
