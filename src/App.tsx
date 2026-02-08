import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRecording } from "@/hooks/useRecording";

export function App() {
  // Initialize recording hook to set up event listeners
  useRecording();

  useEffect(() => {
    getCurrentWindow().show();
  }, []);

  return <AppLayout />;
}

export default App;
