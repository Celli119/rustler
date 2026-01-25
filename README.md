# Rustler

[![CI](https://github.com/Celli119/rustler/actions/workflows/ci.yml/badge.svg)](https://github.com/Celli119/rustler/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Celli119/rustler/graph/badge.svg)](https://codecov.io/gh/Celli119/rustler)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)](https://tauri.app)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey.svg)](#installation)

A fast, privacy-focused voice transcription app built with Tauri and Rust. Transcribe audio locally using OpenAI's Whisper model — no cloud, no data leaving your device.

## Features

- **Local Transcription** — All processing happens on your device using Whisper AI
- **GPU Acceleration** — Optional CUDA/Metal support for faster transcription
- **Global Hotkey** — Start/stop recording from anywhere with a customizable shortcut
- **Multiple Models** — Choose from tiny, base, small, medium, or large Whisper models
- **History** — Browse and copy past transcriptions
- **Cross-Platform** — Works on Linux, macOS, and Windows
- **Minimal Footprint** — Lightweight native app, not an Electron wrapper

## Installation

### Pre-built Binaries

Download the latest release for your platform from the [Releases](https://github.com/Celli119/rustler/releases) page.

| Platform | Format |
|----------|--------|
| Linux | `.deb`, `.rpm`, `.AppImage` |
| macOS | `.dmg` |
| Windows | `.msi`, `.exe` |

### Build from Source

#### Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- [Bun](https://bun.sh/) (recommended) or npm

#### Linux Dependencies

```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

# Fedora
sudo dnf install webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel
```

#### Build

```bash
# Clone the repository
git clone https://github.com/Celli119/rustler.git
cd rustler

# Install dependencies
bun install

# Run in development mode
bun run tauri dev

# Build for production
bun run tauri build
```

## Usage

1. **Download a Model** — Go to the Models tab and download a Whisper model (start with "base" for a good balance of speed and accuracy)

2. **Configure Hotkey** — In Settings, set your preferred global hotkey (default: `Alt+Z`)

3. **Record** — Press the hotkey to start recording, press again to stop and transcribe

4. **Copy Result** — The transcription appears in the overlay and is automatically copied to your clipboard

## Configuration

Settings are stored in:
- Linux: `~/.config/rustler/`
- macOS: `~/Library/Application Support/rustler/`
- Windows: `%APPDATA%\rustler\`

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Rust, Tauri 2.0
- **AI**: whisper-rs (Rust bindings for whisper.cpp)
- **Audio**: cpal for cross-platform audio capture

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) for the speech recognition model
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) for the C++ implementation
- [Tauri](https://tauri.app) for the amazing cross-platform framework
