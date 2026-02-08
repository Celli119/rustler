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
import { GpuToggle } from "@/components/GpuToggle";
import { useSettings } from "@/hooks/useSettings";

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

  const handleLanguageChange = (language: string | null) => {
    if (language) {
      // Disable translate when switching to English
      if (language === "en" && settings.translate) {
        updateSettings({ language, translate: false });
      } else {
        updateSettings({ language });
      }
    }
  };

  const handleTranslateToggle = (checked: boolean) => {
    updateSettings({ translate: checked });
  };

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Language</CardTitle>
          <CardDescription>Select the language for transcription</CardDescription>
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
          {settings.language !== "en" && (
            <div className="flex items-center justify-between space-x-2 mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="translate-toggle">Translate to English</Label>
                <p className="text-sm text-muted-foreground">
                  Transcribe in the selected language and translate the output to English
                </p>
              </div>
              <Switch
                id="translate-toggle"
                checked={settings.translate}
                onCheckedChange={handleTranslateToggle}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
          <CardDescription>Configure performance-related settings</CardDescription>
        </CardHeader>
        <CardContent>
          <GpuToggle />
        </CardContent>
      </Card>
    </div>
  );
}
