import { Mic, Minus, Square, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <header className="flex items-center justify-between border-b border-border select-none">
      {/* Draggable region with app branding */}
      <div
        className="flex items-center gap-3 flex-1 px-6 py-4 cursor-default"
        data-tauri-drag-region
      >
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground pointer-events-none">
          <Mic className="size-4" />
        </div>
        <h1 className="text-xl font-semibold pointer-events-none">Rustler</h1>
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
            <Square className="size-3" />
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
