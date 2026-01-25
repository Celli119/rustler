import { Minus, Square, X, Copy } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

/**
 * Small dune icon for the app header - fills the full circle
 */
function DuneAppIcon() {
  return (
    <svg viewBox="0 0 90 90" fill="none" className="size-full">
      <defs>
        <linearGradient id="headerDuneGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cd7f32" />
          <stop offset="100%" stopColor="#b45328" />
        </linearGradient>
        <linearGradient id="headerDuneGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b45328" />
          <stop offset="100%" stopColor="#8b4513" />
        </linearGradient>
        <linearGradient id="headerDuneGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b4513" />
          <stop offset="100%" stopColor="#6b3410" />
        </linearGradient>
      </defs>
      <path
        d="M 0 50 Q 15 35, 30 42 Q 50 52, 70 38 Q 85 28, 90 35 L 90 90 L 0 90 Z"
        fill="url(#headerDuneGradient1)"
      />
      <path
        d="M 0 60 Q 20 50, 40 55 Q 60 62, 80 52 Q 88 48, 90 52 L 90 90 L 0 90 Z"
        fill="url(#headerDuneGradient2)"
      />
      <path
        d="M 0 72 Q 25 65, 45 70 Q 65 76, 90 68 L 90 90 L 0 90 Z"
        fill="url(#headerDuneGradient3)"
      />
    </svg>
  );
}

export function AppHeader() {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial state
    appWindow.isMaximized().then(setIsMaximized);

    // Listen for resize events to update state
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  const handleMouseDown = async (e: React.MouseEvent) => {
    // Only drag on left mouse button
    if (e.button !== 0) return;

    // Double-click to maximize
    if (e.detail === 2) {
      await appWindow.toggleMaximize();
      return;
    }

    // Start window drag
    await appWindow.startDragging();
  };

  return (
    <header className="flex items-center justify-between border-b border-border/50 select-none bg-background/70 backdrop-blur-md">
      {/* Draggable region with app branding */}
      <div
        className="flex items-center gap-3 flex-1 px-6 py-4 cursor-default"
        onMouseDown={handleMouseDown}
        data-tauri-drag-region
      >
        <div
          className="flex items-center justify-center size-8 rounded-full overflow-hidden pointer-events-none"
          style={{
            background: "linear-gradient(135deg, #c9935a 0%, #d4984f 100%)",
            boxShadow: "0 0 0 0.5px rgba(201, 147, 90, 0.5)",
          }}
          data-tauri-drag-region
        >
          <DuneAppIcon />
        </div>
        <h1 className="text-xl font-semibold" data-tauri-drag-region>
          Rustler
        </h1>
      </div>

      {/* Window controls */}
      <div className="flex items-center">
        <ThemeToggle />
        <div className="flex items-center border-l border-border ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-none h-14 w-12 hover:bg-muted"
            onClick={handleMinimize}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-none h-14 w-12 hover:bg-muted"
            onClick={handleMaximize}
          >
            {isMaximized ? <Copy className="size-3" /> : <Square className="size-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-none h-14 w-12 hover:bg-destructive hover:text-white"
            onClick={handleClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
