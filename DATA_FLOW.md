# Data Flow Architecture

## Overview
This document visualizes how data flows through the OpenWhispr frontend.

## Component Hierarchy

```
App
├── PillOverlay (floating, always visible)
│   └── Uses: useAppStore (isRecording, isProcessing, transcription)
│
└── SettingsPanel
    ├── HotkeyConfig
    │   ├── Uses: useSettings (settings, updateHotkey)
    │   └── Uses: useHotkey (recording, validation)
    │
    ├── Language Selector
    │   └── Uses: useSettings (settings, updateSettings)
    │
    ├── GpuToggle
    │   └── Uses: useSettings (settings, updateSettings)
    │
    └── ModelSelector
        └── Uses: useModels (models, download, delete)
```

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Zustand Store                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ State:                                                │  │
│  │  - isRecording, isProcessing, transcription           │  │
│  │  - settings { hotkey, model, useGpu, language }       │  │
│  │  - models, downloadingModel, downloadProgress         │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Actions:                                              │  │
│  │  - setRecording, setProcessing, setTranscription      │  │
│  │  - setSettings, setModels, setDownloading             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              ▲                            │
              │                            │
              │                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Custom Hooks                            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ useRecording │  │ useSettings  │  │   useModels     │   │
│  │              │  │              │  │                 │   │
│  │ - Reads      │  │ - Reads      │  │ - Reads         │   │
│  │ - Updates    │  │ - Updates    │  │ - Updates       │   │
│  │ - Events     │  │ - Saves      │  │ - Downloads     │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
              ▲                            │
              │                            │
              │                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Tauri API Layer                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Commands (invoke):                                    │  │
│  │  - startRecording, stopRecording                      │  │
│  │  - getSettings, saveSettings                          │  │
│  │  - getAvailableModels, downloadModel, deleteModel     │  │
│  │  - registerHotkey, pasteText                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Events (listen):                                      │  │
│  │  - download-progress                                  │  │
│  │  - recording-status                                   │  │
│  │  - transcription-complete                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              ▲                            │
              │                            │
              │                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Rust Backend (Tauri)                      │
│  - Audio recording                                          │
│  - Whisper transcription                                    │
│  - Settings persistence                                     │
│  - Model management                                         │
│  - Global hotkey handling                                   │
└─────────────────────────────────────────────────────────────┘
```

## Recording Flow (Step by Step)

```
1. User Presses Hotkey
   └─> Backend detects hotkey
       └─> Backend emits "recording-status" event { isRecording: true }

2. Frontend Receives Event
   └─> onRecordingStatus listener in useRecording
       └─> Calls setRecording(true) in store
           └─> PillOverlay re-renders showing "Recording..."

3. User Presses Hotkey Again
   └─> Backend stops recording
       └─> Backend emits "recording-status" event { isRecording: false }
           └─> Backend starts processing audio
               └─> Frontend sets isProcessing: true
                   └─> PillOverlay shows "Processing..."

4. Backend Completes Transcription
   └─> Backend emits "transcription-complete" event { text: "..." }
       └─> onTranscriptionComplete listener in useRecording
           └─> Calls setTranscription(text) and setProcessing(false)
               └─> PillOverlay shows transcription
                   └─> Auto-hides after 3 seconds
                       └─> Backend pastes text to active window
```

## Settings Update Flow

```
1. User Changes Setting in UI
   └─> Component calls updateSettings({ language: "es" })

2. useSettings Hook
   └─> Merges new settings with existing
       └─> Calls saveSettings(updatedSettings) Tauri command

3. Backend
   └─> Saves to config file
       └─> Returns success

4. Frontend
   └─> Calls setSettings(newSettings) in store
       └─> UI re-renders with new settings
```

## Model Download Flow

```
1. User Clicks "Download" on Model
   └─> ModelSelector calls downloadModel(modelId)

2. useModels Hook
   └─> Calls setDownloading(modelId, 0)
       └─> Calls downloadModel(modelId) Tauri command

3. Backend Starts Download
   └─> Periodically emits "download-progress" events
       { modelId: "base", percentage: 25 }

4. Frontend Receives Progress Events
   └─> onDownloadProgress listener in useModels
       └─> Calls setDownloading(modelId, percentage)
           └─> Progress bar updates in ModelSelector

5. Download Completes
   └─> Backend finishes download
       └─> Frontend refreshes models list
           └─> Downloaded model shows "Delete" button
```

## Hotkey Registration Flow

```
1. User Clicks "Record Hotkey"
   └─> HotkeyConfig calls startRecording() from useHotkey

2. User Presses Key Combination
   └─> useHotkey captures keyboard events
       └─> Builds hotkey string (e.g., "Ctrl+Shift+R")
           └─> Displays in UI

3. User Clicks "Save" (or Stop Recording)
   └─> HotkeyConfig calls validateHotkey()
       └─> If valid: calls updateHotkey(hotkey) from useSettings

4. useSettings Hook
   └─> Calls registerHotkey(hotkey) Tauri command
       └─> Backend registers global hotkey
           └─> Frontend calls updateSettings({ hotkey })
               └─> Settings saved and UI updated
```

## Event Listener Lifecycle

```
Component Mount
  └─> useEffect hook runs
      └─> Sets up event listeners
          ├─> const unlisten1 = await onRecordingStatus(callback)
          ├─> const unlisten2 = await onTranscriptionComplete(callback)
          └─> const unlisten3 = await onDownloadProgress(callback)

Component Updates
  └─> Event listeners remain active
      └─> Callbacks update store
          └─> Components re-render

Component Unmount
  └─> useEffect cleanup function runs
      └─> Calls all unlisten functions
          ├─> unlisten1()
          ├─> unlisten2()
          └─> unlisten3()
```

## Store Update Pattern

```
Direct Update (Simple):
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Component  │ ─────>│    Store    │ ─────>│  Re-render  │
│             │       │   Action    │       │             │
└─────────────┘       └─────────────┘       └─────────────┘

Via Hook (With Backend):
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Component  │ ─────>│    Hook     │ ─────>│    Tauri    │
│             │       │  Function   │       │   Command   │
└─────────────┘       └─────────────┘       └─────────────┘
                            │                      │
                            │                      ▼
                            │               ┌─────────────┐
                            │               │   Backend   │
                            │               │  Processes  │
                            │               └─────────────┘
                            │                      │
                            ▼                      ▼
                      ┌─────────────┐       ┌─────────────┐
                      │    Store    │ <──── │   Success   │
                      │   Action    │       │             │
                      └─────────────┘       └─────────────┘
                            │
                            ▼
                      ┌─────────────┐
                      │  Re-render  │
                      │             │
                      └─────────────┘
```

## Error Handling Flow

```
1. User Action
   └─> Component calls hook function
       └─> Hook calls Tauri command in try-catch

2. Backend Error
   └─> Tauri command throws error
       └─> Catch block in hook
           ├─> console.error(error)
           ├─> Set error state (if needed)
           └─> Display error to user

3. Validation Error
   └─> Hook validates input
       └─> If invalid: throw error or return false
           └─> Component shows error message
               └─> User corrects input
```

## Data Types Flow

```
TypeScript Types (Frontend)
  ├─> Settings interface
  ├─> WhisperModel interface
  └─> Event payload interfaces

            │
            ▼

Tauri API Wrappers
  ├─> Type-safe command functions
  └─> Type-safe event listeners

            │
            ▼

Rust Types (Backend)
  ├─> Serialized to JSON
  └─> Sent to frontend

            │
            ▼

Frontend receives typed data
  ├─> Store updates with typed data
  └─> Components render with type safety
```

## Performance Optimizations

1. **Zustand Selectors**
   ```typescript
   // Only re-render when specific state changes
   const isRecording = useAppStore(state => state.isRecording);
   ```

2. **Event Listener Cleanup**
   ```typescript
   // Prevent memory leaks
   useEffect(() => {
     // ... setup listeners
     return () => {
       // cleanup
     };
   }, []);
   ```

3. **Callback Memoization**
   ```typescript
   // Prevent unnecessary re-creates
   const handleUpdate = useCallback(() => {
     // ...
   }, [dependencies]);
   ```

## Summary

- **Components** read from store and dispatch actions
- **Hooks** manage business logic and backend communication
- **Store** holds single source of truth
- **Tauri Layer** bridges frontend and backend
- **Events** enable real-time updates
- **Types** ensure safety throughout
