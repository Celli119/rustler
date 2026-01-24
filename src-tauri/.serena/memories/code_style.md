# Code Style and Conventions

## General
- Rust 2021 edition
- Minimum Rust version: 1.77.2
- Warnings are treated as errors (`#![deny(warnings)]`)

## Naming Conventions
- Types: PascalCase (e.g., `ModelDownloader`, `RecordingHandle`)
- Functions/methods: snake_case (e.g., `start_recording`, `get_model_path`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `WHISPER_MODELS`)

## Documentation
- Use `///` for public item documentation
- Include `# Arguments`, `# Returns` sections for public methods
- Use `# Examples` section when helpful

## Error Handling
- Use `anyhow::Result` for functions that can fail with various errors
- Use `anyhow::Context` for adding context to errors
- Use `anyhow::anyhow!()` for creating ad-hoc errors
- Tauri commands return `Result<T, String>` for serialization

## Module Organization
- Use `mod.rs` for module definitions
- Re-export public items in `mod.rs`
- Keep related functionality in the same module

## Threading
- Use `parking_lot::Mutex` instead of `std::sync::Mutex`
- Use `Arc` for shared ownership across threads
