import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GpuToggle } from "@/components/GpuToggle";
import { useSettings } from "@/hooks/useSettings";
import { restartApp } from "@/lib/tauri";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "auto", name: "Auto-detect" },
];

export function SettingsTab() {
  const { settings, updateSettings } = useSettings();
  const [overlaySettingChanged, setOverlaySettingChanged] = useState(false);
  const initialOverlaySetting = useRef<boolean | null>(null);

  // Track initial overlay setting value
  useEffect(() => {
    if (initialOverlaySetting.current === null) {
      initialOverlaySetting.current = settings.showOverlayOnlyDuringRecording;
    }
  }, [settings.showOverlayOnlyDuringRecording]);

  const handleLanguageChange = (language: string | null) => {
    if (language) {
      updateSettings({ language });
    }
  };

  const handleOverlayToggle = (checked: boolean) => {
    updateSettings({ showOverlayOnlyDuringRecording: checked });
    // Show restart notice if setting changed from initial value
    setOverlaySettingChanged(checked !== initialOverlaySetting.current);
  };

  const handleRestart = () => {
    restartApp();
  };

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Language</CardTitle>
          <CardDescription>
            Select the language for transcription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="language-select">Transcription Language</Label>
            <Select value={settings.language} onValueChange={handleLanguageChange}>
              <SelectTrigger id="language-select">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
          <CardDescription>
            Configure performance-related settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GpuToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overlay</CardTitle>
          <CardDescription>
            Configure the floating overlay button
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="overlay-toggle">Show only during recording</Label>
              <p className="text-sm text-muted-foreground">
                Hide the overlay button when not recording
              </p>
            </div>
            <Switch
              id="overlay-toggle"
              checked={settings.showOverlayOnlyDuringRecording}
              onCheckedChange={handleOverlayToggle}
            />
          </div>
          {overlaySettingChanged && (
            <Alert variant="warning" className="flex items-center justify-between">
              <AlertDescription>
                Restart required for this change to take effect
              </AlertDescription>
              <Button size="sm" variant="outline" onClick={handleRestart}>
                Restart
              </Button>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
