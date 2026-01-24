import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HotkeyConfig } from "@/components/HotkeyConfig";
import { useRecording } from "@/hooks/useRecording";

export function RecordingTab() {
  const { isRecording, isProcessing, transcription, startRecording, stopRecording } = useRecording();

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
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
    </div>
  );
}
