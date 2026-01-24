import { Mic } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground">
          <Mic className="size-4" />
        </div>
        <h1 className="text-xl font-semibold">Rustler</h1>
      </div>
      <ThemeToggle />
    </header>
  );
}
