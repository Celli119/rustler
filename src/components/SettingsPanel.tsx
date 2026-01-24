import { HotkeyConfig } from "@/components/HotkeyConfig";
import { ModelSelector } from "@/components/ModelSelector";
import { GpuToggle } from "@/components/GpuToggle";
import { TranscriptionHistory } from "@/components/TranscriptionHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/useSettings";
import { useRecording } from "@/hooks/useRecording";

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

export function SettingsPanel() {
  const { settings, updateSettings } = useSettings();
  const { isRecording, isProcessing, transcription, startRecording, stopRecording } = useRecording();

  const handleLanguageChange = (language: string | null) => {
    if (language) {
      updateSettings({ language });
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Rustler Settings</h1>
        <p className="text-muted-foreground">
          Configure your voice transcription settings
        </p>
      </div>

      {/* Transcription History */}
      <TranscriptionHistory />

      {/* Test Recording Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Recording</CardTitle>
          <CardDescription>
            Test voice recording manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleToggleRecording}
            variant={isRecording ? "destructive" : "default"}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : isRecording ? "Stop Recording" : "Start Recording"}
          </Button>
          {transcription && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Last transcription:</p>
              <p className="text-sm text-muted-foreground">{transcription}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hotkey Configuration</CardTitle>
          <CardDescription>
            Set a global hotkey to start/stop recording
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HotkeyConfig />
        </CardContent>
      </Card>

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
          <CardTitle>Models</CardTitle>
          <CardDescription>
            Manage Whisper transcription models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModelSelector />
        </CardContent>
      </Card>
    </div>
  );
}
