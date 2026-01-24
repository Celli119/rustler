import { SettingsPanel } from "@/components/SettingsPanel";
import { useRecording } from "@/hooks/useRecording";

export function App() {
  // Initialize recording hook to set up event listeners
  useRecording();

  return <SettingsPanel />;
}

export default App;