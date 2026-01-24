import { AppLayout } from "@/components/layout/AppLayout";
import { useRecording } from "@/hooks/useRecording";

export function App() {
  // Initialize recording hook to set up event listeners
  useRecording();

  return <AppLayout />;
}

export default App;
