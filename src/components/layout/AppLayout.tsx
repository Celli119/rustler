import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { TabNavigation, type TabId } from "./TabNavigation";
import { HistoryTab } from "@/components/tabs/HistoryTab";
import { RecordingTab } from "@/components/tabs/RecordingTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { ModelsTab } from "@/components/tabs/ModelsTab";
import { useSettings } from "@/hooks/useSettings";
import { useHotkeyListener } from "@/hooks/useHotkeyListener";

export function AppLayout() {
  const [activeTab, setActiveTab] = useState<TabId>("history");

  // Load settings and register hotkey on app startup
  useSettings();

  // Listen for hotkey events globally (so it works even before visiting Recording tab)
  useHotkeyListener();

  const renderTabContent = () => {
    switch (activeTab) {
      case "history":
        return <HistoryTab />;
      case "recording":
        return <RecordingTab />;
      case "settings":
        return <SettingsTab />;
      case "models":
        return <ModelsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <AppHeader />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-auto p-6">
        {renderTabContent()}
      </main>
    </div>
  );
}
