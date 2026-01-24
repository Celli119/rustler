# Component Usage Guide

## Quick Start

The React frontend is now fully set up with:
- Zustand state management
- Typed Tauri API wrappers
- Custom hooks for common operations
- Complete component stubs ready for integration

## Using Components

### Basic App Structure

```typescript
import { SettingsPanel, PillOverlay } from "@/components";
import { useRecording } from "@/hooks";

export function App() {
  // Initialize recording to set up event listeners
  useRecording();

  return (
    <>
      <PillOverlay />
      <SettingsPanel />
    </>
  );
}
```

### Working with Recording

```typescript
import { useRecording } from "@/hooks/useRecording";

function MyComponent() {
  const {
    isRecording,
    isProcessing,
    transcription,
    startRecording,
    stopRecording,
  } = useRecording();

  return (
    <div>
      <button onClick={startRecording} disabled={isRecording}>
        Start Recording
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop Recording
      </button>
      {isProcessing && <p>Processing...</p>}
      {transcription && <p>Result: {transcription}</p>}
    </div>
  );
}
```

### Managing Settings

```typescript
import { useSettings } from "@/hooks/useSettings";

function SettingsComponent() {
  const { settings, updateSettings, updateHotkey } = useSettings();

  const handleLanguageChange = (lang: string) => {
    updateSettings({ language: lang });
  };

  const handleGpuToggle = () => {
    updateSettings({ useGpu: !settings.useGpu });
  };

  return (
    <div>
      <p>Current hotkey: {settings.hotkey}</p>
      <p>Model: {settings.model}</p>
      <p>GPU: {settings.useGpu ? "Enabled" : "Disabled"}</p>
      <p>Language: {settings.language}</p>
    </div>
  );
}
```

### Recording Hotkeys

```typescript
import { useHotkey } from "@/hooks/useHotkey";

function HotkeyRecorder() {
  const {
    isRecording,
    startRecording,
    stopRecording,
    getHotkeyString,
    validateHotkey,
  } = useHotkey();

  const handleSave = () => {
    const hotkey = getHotkeyString();
    if (validateHotkey(hotkey)) {
      // Save the hotkey
      stopRecording();
    } else {
      alert("Invalid hotkey combination");
    }
  };

  return (
    <div>
      <button onClick={isRecording ? handleSave : startRecording}>
        {isRecording ? "Save Hotkey" : "Record Hotkey"}
      </button>
      {isRecording && <p>Press your key combination...</p>}
      <p>Current: {getHotkeyString()}</p>
    </div>
  );
}
```

### Managing Models

```typescript
import { useModels } from "@/hooks/useModels";

function ModelManager() {
  const {
    models,
    downloadingModel,
    downloadProgress,
    downloadModel,
    deleteModel,
  } = useModels();

  return (
    <div>
      {models.map((model) => (
        <div key={model.id}>
          <h3>{model.name}</h3>
          <p>Size: {model.size}</p>
          {model.downloaded ? (
            <button onClick={() => deleteModel(model.id)}>Delete</button>
          ) : (
            <button
              onClick={() => downloadModel(model.id)}
              disabled={downloadingModel !== null}
            >
              Download
            </button>
          )}
          {downloadingModel === model.id && (
            <progress value={downloadProgress} max={100} />
          )}
        </div>
      ))}
    </div>
  );
}
```

### Direct Tauri API Calls

```typescript
import {
  startRecording,
  stopRecording,
  pasteText,
} from "@/lib/tauri";

async function directApiExample() {
  // Start recording
  await startRecording();

  // Wait some time...
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Stop and get transcription
  const text = await stopRecording();
  console.log("Transcribed:", text);

  // Paste to active window
  await pasteText(text);
}
```

### Event Listeners

```typescript
import { useEffect } from "react";
import {
  onRecordingStatus,
  onTranscriptionComplete,
  onDownloadProgress,
} from "@/lib/tauri";

function EventListenerExample() {
  useEffect(() => {
    let unlistenRecording: (() => void) | undefined;
    let unlistenTranscription: (() => void) | undefined;
    let unlistenProgress: (() => void) | undefined;

    const setup = async () => {
      unlistenRecording = await onRecordingStatus((status) => {
        console.log("Recording:", status.isRecording);
      });

      unlistenTranscription = await onTranscriptionComplete((result) => {
        console.log("Transcription:", result.text);
      });

      unlistenProgress = await onDownloadProgress((progress) => {
        console.log(`Model ${progress.modelId}: ${progress.percentage}%`);
      });
    };

    setup();

    return () => {
      unlistenRecording?.();
      unlistenTranscription?.();
      unlistenProgress?.();
    };
  }, []);

  return <div>Listening for events...</div>;
}
```

## State Management

### Reading from Store

```typescript
import { useAppStore } from "@/stores/appStore";

function StoreReader() {
  const { isRecording, transcription, settings } = useAppStore();

  return (
    <div>
      <p>Recording: {isRecording ? "Yes" : "No"}</p>
      <p>Latest: {transcription || "None"}</p>
      <p>Model: {settings.model}</p>
    </div>
  );
}
```

### Updating Store

```typescript
import { useAppStore } from "@/stores/appStore";

function StoreUpdater() {
  const {
    setRecording,
    setTranscription,
    setSettings,
  } = useAppStore();

  const handleUpdate = () => {
    setRecording(true);
    setTranscription("Hello world");
    setSettings({ language: "es" });
  };

  return <button onClick={handleUpdate}>Update Store</button>;
}
```

## Component Composition

### Custom Recording Button

```typescript
import { useRecording } from "@/hooks";
import { Button } from "@/components/ui/button";

function RecordButton() {
  const { isRecording, isProcessing, startRecording, stopRecording } =
    useRecording();

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isProcessing}
      variant={isRecording ? "destructive" : "default"}
    >
      {isProcessing
        ? "Processing..."
        : isRecording
        ? "Stop Recording"
        : "Start Recording"}
    </Button>
  );
}
```

### Status Indicator

```typescript
import { useAppStore } from "@/stores/appStore";

function StatusIndicator() {
  const { isRecording, isProcessing } = useAppStore();

  const status = isRecording
    ? "🔴 Recording"
    : isProcessing
    ? "⚡ Processing"
    : "✓ Ready";

  return (
    <div className="flex items-center gap-2">
      <span>{status}</span>
    </div>
  );
}
```

## Tips

1. **Always use hooks**: Prefer `useRecording()`, `useSettings()`, etc. over direct API calls
2. **Event cleanup**: Always return cleanup functions from useEffect
3. **Error handling**: Wrap async operations in try-catch
4. **Type safety**: Use the exported types from `@/lib/tauri`
5. **State updates**: Use Zustand actions, not direct state mutation

## Next Steps

To connect to the actual Tauri backend:

1. Ensure backend commands match the frontend API wrappers
2. Verify event names match (e.g., "recording-status", "transcription-complete")
3. Test each command individually
4. Add error handling and user feedback
5. Implement proper loading states
