# Rustler Project Overview

## Purpose

Rustler is a speech-to-text desktop application built with Tauri. It uses Whisper for transcription, allowing users to record audio and convert it to text.

## Tech Stack

- **Framework**: Tauri 2.x (Rust backend + web frontend)
- **Audio**: cpal for cross-platform audio capture
- **Transcription**: whisper-rs (Whisper.cpp Rust bindings)
- **State Management**: parking_lot for mutexes
- **Error Handling**: anyhow for error propagation, thiserror for custom errors
- **HTTP**: reqwest for downloading models
- **Serialization**: serde/serde_json for settings

## Project Structure

```
src/
├── lib.rs          - Main library entry point, AppState definition
├── main.rs         - Binary entry point
├── commands/       - Tauri command handlers
│   ├── mod.rs
│   ├── settings.rs - Settings load/save commands
│   ├── transcription.rs - Transcription commands
│   ├── models.rs   - Model management commands
│   └── recording.rs - Recording commands
├── whisper/        - Whisper transcription module
│   ├── mod.rs
│   ├── context.rs  - WhisperContext wrapper
│   └── transcriber.rs - Transcription logic
├── audio/          - Audio recording module
│   ├── mod.rs
│   └── recorder.rs - AudioRecorder implementation
├── hotkey/         - Global hotkey management
│   └── mod.rs      - HotkeyManager
├── models/         - Model downloading
│   ├── mod.rs
│   └── downloader.rs - ModelDownloader
└── clipboard/      - Platform-specific clipboard
    ├── mod.rs
    ├── linux.rs
    ├── macos.rs
    └── windows.rs
```
