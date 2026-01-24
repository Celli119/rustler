# Rust Backend Reference

This document provides reference information for the Rust backend implementation.

## Project Structure

```
src-tauri/
├── Cargo.toml              # Dependencies configuration
├── tauri.conf.json         # Tauri app configuration
├── capabilities/
│   └── default.json        # Security permissions
└── src/
    ├── lib.rs              # Main library entry point
    ├── main.rs             # Executable entry point
    ├── commands/           # Tauri command handlers
    ├── whisper/            # Whisper AI integration
    ├── audio/              # Audio recording
    ├── clipboard/          # Platform-specific clipboard
    ├── hotkey/             # Global hotkey management
    └── models/             # Model downloading
```

## Calling Tauri Commands from Frontend (TypeScript)

```typescript
import { invoke } from '@tauri-apps/api/core';

// Recording
await invoke('start_recording');
const audioPath = await invoke('stop_recording');

// Transcription
const text = await invoke('transcribe_audio', {
  audioPath: '/path/to/audio.wav',
  model: 'base'
});

// Settings
const settings = await invoke('get_settings');
await invoke('save_settings', {
  settings: {
    hotkey: 'CommandOrControl+Shift+Space',
    model: 'base',
    use_gpu: false,
    language: 'en'
  }
});

// Models
const models = await invoke('get_available_models');
await invoke('download_model', { modelId: 'base' });
await invoke('delete_model', { modelId: 'base' });
const modelsDir = await invoke('get_models_dir');
```

## Available Models

- `tiny` - 75 MB
- `base` - 142 MB (recommended for most users)
- `small` - 466 MB
- `medium` - 1.5 GB
- `large` - 2.9 GB
- `turbo` - 809 MB (fastest large model)

## Settings Structure

```rust
pub struct Settings {
    pub hotkey: String,      // e.g., "CommandOrControl+Shift+Space"
    pub model: String,       // e.g., "base"
    pub use_gpu: bool,       // GPU acceleration (if available)
    pub language: String,    // e.g., "en", "es", "fr"
}
```

## Model Structure

```rust
pub struct WhisperModel {
    pub id: String,          // Model identifier
    pub name: String,        // Display name
    pub size: u64,           // Size in MB
    pub downloaded: bool,    // Download status
}
```

## Audio Format

The recorder captures audio in the following format:
- Sample rate: 16 kHz (required by Whisper)
- Channels: 1 (mono)
- Format: f32 samples, exported as 16-bit WAV

## File Locations

Settings are stored in:
- **Linux**: `~/.config/open-whispr/settings.json`
- **macOS**: `~/Library/Application Support/open-whispr/settings.json`
- **Windows**: `%APPDATA%\open-whispr\settings.json`

Models are downloaded to:
- **Linux**: `~/.local/share/open-whispr/models/`
- **macOS**: `~/Library/Application Support/open-whispr/models/`
- **Windows**: `%LOCALAPPDATA%\open-whispr\models\`

## Error Handling

All commands return `Result<T, String>`. Handle errors in frontend:

```typescript
try {
  await invoke('start_recording');
} catch (error) {
  console.error('Recording failed:', error);
}
```

## Events

Listen for download progress:

```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('model-download-progress', (event) => {
  console.log('Progress:', event.payload); // 0.0 to 1.0
});
```

## Platform-Specific Clipboard

The clipboard module automatically uses the correct implementation:
- **macOS**: AppleScript (`osascript`)
- **Linux**: xdotool (X11) or wtype (Wayland)
- **Windows**: Win32 SendInput API

## Logging

Logs are enabled in debug mode. Use standard Rust logging:

```rust
log::info!("Information message");
log::warn!("Warning message");
log::error!("Error message");
```

## Build Commands

```bash
# Development build
cd src-tauri && cargo build

# Release build
cd src-tauri && cargo build --release

# Check for errors
cd src-tauri && cargo check

# Run tests
cd src-tauri && cargo test
```

## Dependencies Overview

| Dependency | Purpose |
|------------|---------|
| tauri | Desktop app framework |
| whisper-rs | Whisper AI inference |
| cpal | Cross-platform audio |
| hound | WAV file I/O |
| serde | Serialization |
| tokio | Async runtime |
| reqwest | HTTP downloads |
| parking_lot | Efficient mutexes |
| anyhow | Error handling |

