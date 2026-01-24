# Frontend Structure Documentation

## Overview
This document describes the React frontend structure for OpenWhispr Tauri application.

## Directory Structure

```
src/
├── components/           # React components
│   ├── ui/              # ShadCN UI components
│   ├── PillOverlay.tsx  # Floating recording status indicator
│   ├── SettingsPanel.tsx # Main settings interface
│   ├── ModelSelector.tsx # Model management UI
│   ├── HotkeyConfig.tsx  # Hotkey configuration UI
│   ├── GpuToggle.tsx     # GPU acceleration toggle
│   └── index.ts          # Component exports
│
├── hooks/               # Custom React hooks
│   ├── useRecording.ts  # Recording state and controls
│   ├── useSettings.ts   # Settings management
│   ├── useHotkey.ts     # Hotkey recording and validation
│   ├── useModels.ts     # Model management
│   └── index.ts         # Hook exports
│
├── lib/                 # Library code
│   └── tauri.ts        # Tauri API wrappers
│
├── stores/              # State management
│   └── appStore.ts     # Zustand store
│
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
└── index.css            # Global styles
```

## State Management (Zustand)

### App Store (`src/stores/appStore.ts`)

Central state management using Zustand.

**State:**
- `isRecording: boolean` - Current recording status
- `isProcessing: boolean` - Transcription processing status
- `transcription: string | null` - Latest transcription result
- `settings: Settings` - Application settings
- `models: WhisperModel[]` - Available Whisper models
- `downloadingModel: string | null` - Currently downloading model ID
- `downloadProgress: number` - Download progress (0-100)

**Actions:**
- `setRecording(recording: boolean)` - Update recording status
- `setProcessing(processing: boolean)` - Update processing status
- `setTranscription(text: string | null)` - Set transcription result
- `setSettings(settings: Partial<Settings>)` - Update settings
- `setModels(models: WhisperModel[])` - Update models list
- `setDownloading(modelId: string | null, progress: number)` - Update download status

## Tauri API Wrappers (`src/lib/tauri.ts`)

Typed TypeScript wrappers for all Tauri backend commands.

### Types

```typescript
interface Settings {
  hotkey: string;
  model: string;
  useGpu: boolean;
  language: string;
}

interface WhisperModel {
  id: string;
  name: string;
  size: string;
  downloaded: boolean;
}
```

### Commands

- `startRecording(): Promise<void>` - Start audio recording
- `stopRecording(): Promise<string>` - Stop recording and get transcription
- `getSettings(): Promise<Settings>` - Load settings
- `saveSettings(settings: Settings): Promise<void>` - Save settings
- `getAvailableModels(): Promise<WhisperModel[]>` - Get model list
- `downloadModel(modelId: string): Promise<void>` - Download a model
- `deleteModel(modelId: string): Promise<void>` - Delete a model
- `registerHotkey(shortcut: string): Promise<void>` - Register global hotkey
- `pasteText(text: string): Promise<void>` - Paste text to active window

### Event Listeners

- `onDownloadProgress(callback)` - Model download progress updates
- `onRecordingStatus(callback)` - Recording status changes
- `onTranscriptionComplete(callback)` - Transcription completion

## Custom Hooks

### useRecording
Manages recording state and transcription.

```typescript
const {
  isRecording,
  isProcessing,
  transcription,
  startRecording,
  stopRecording,
} = useRecording();
```

### useSettings
Manages application settings.

```typescript
const {
  settings,
  updateSettings,
  updateHotkey,
} = useSettings();
```

### useHotkey
Handles hotkey recording and validation.

```typescript
const {
  isRecording,
  startRecording,
  stopRecording,
  getHotkeyString,
  validateHotkey,
} = useHotkey();
```

### useModels
Manages Whisper model downloads and deletion.

```typescript
const {
  models,
  downloadingModel,
  downloadProgress,
  downloadModel,
  deleteModel,
} = useModels();
```

## Components

### PillOverlay
Floating status indicator showing recording/processing state.

**Features:**
- Shows current state (idle, recording, processing, done)
- Animated indicators
- Draggable positioning
- Auto-hides after transcription complete

### SettingsPanel
Main settings interface.

**Sections:**
- Hotkey configuration
- Language selection
- GPU acceleration toggle
- Model management

### ModelSelector
Manages Whisper model downloads.

**Features:**
- Lists all available models
- Download/delete models
- Shows download progress
- Model selection

### HotkeyConfig
Hotkey configuration interface.

**Features:**
- Display current hotkey
- Record new hotkey
- Validate hotkey combinations
- Save to backend

### GpuToggle
Simple toggle for GPU acceleration.

## Event Flow

### Recording Flow
1. User presses global hotkey (backend triggers)
2. Backend emits `recording-status` event
3. `useRecording` updates store via `setRecording(true)`
4. `PillOverlay` shows recording indicator
5. User presses hotkey again to stop
6. Backend processes audio and emits `transcription-complete`
7. `useRecording` updates transcription in store
8. `PillOverlay` shows result, then auto-hides

### Settings Update Flow
1. User changes setting in UI
2. Component calls `updateSettings()`
3. Hook calls `saveSettings()` Tauri command
4. Backend saves to config file
5. Store updated with new settings

### Model Download Flow
1. User clicks "Download" on model
2. `ModelSelector` calls `downloadModel()`
3. Backend starts download and emits progress events
4. `useModels` updates download progress in store
5. Progress bar updates in real-time
6. On completion, models list refreshed

## Styling

Using:
- Tailwind CSS for utility classes
- ShadCN UI for component library
- Custom CSS variables for theming
- Dark mode support

## Best Practices

1. **Type Safety**: All Tauri commands are fully typed
2. **Error Handling**: All async operations wrapped in try-catch
3. **State Management**: Single source of truth in Zustand store
4. **Event Cleanup**: All event listeners cleaned up on unmount
5. **Component Separation**: Clear separation of concerns
6. **Custom Hooks**: Reusable logic extracted into hooks
