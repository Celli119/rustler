import { History, Mic, Settings, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TabId = "history" | "recording" | "settings" | "models";

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "history", label: "History", icon: <History className="size-4" /> },
  { id: "recording", label: "Recording", icon: <Mic className="size-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="size-4" /> },
  { id: "models", label: "Models", icon: <Box className="size-4" /> },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <nav className="flex items-center gap-1 px-6 py-2 border-b border-border bg-muted/30">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant="ghost"
          size="sm"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "gap-2",
            activeTab === tab.id && "bg-background shadow-sm"
          )}
        >
          {tab.icon}
          {tab.label}
        </Button>
      ))}
    </nav>
  );
}
