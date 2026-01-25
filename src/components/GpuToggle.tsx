import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/useSettings";

export function GpuToggle() {
  const { settings, updateSettings } = useSettings();

  const handleToggle = (checked: boolean) => {
    updateSettings({ useGpu: checked });
  };

  return (
    <div className="flex items-center justify-between space-x-2">
      <div className="space-y-0.5">
        <Label htmlFor="gpu-toggle">GPU Acceleration</Label>
        <p className="text-sm text-muted-foreground">
          Use GPU for faster transcription (requires CUDA support)
        </p>
      </div>
      <Switch id="gpu-toggle" checked={settings.useGpu} onCheckedChange={handleToggle} />
    </div>
  );
}
