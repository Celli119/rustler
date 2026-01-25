import { Mic, Minus, Square, X, Copy } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

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
          className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground"
          data-tauri-drag-region
        >
          <Mic className="size-4 pointer-events-none" />
        </div>
        <h1
          className="text-xl font-semibold"
          data-tauri-drag-region
        >Rustler</h1>
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
