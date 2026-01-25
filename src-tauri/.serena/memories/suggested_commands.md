# Suggested Commands for Development

## Build Commands

```bash
# Build the project
cargo build

# Build for release
cargo build --release
```

## Testing Commands

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test module
cargo test models::downloader::tests
cargo test commands::settings::tests
```

## Linting and Formatting

```bash
# Format code
cargo fmt

# Check formatting without modifying
cargo fmt --check

# Run clippy lints
cargo clippy

# Run clippy with strict warnings
cargo clippy -- -D warnings
```

## Tauri-specific Commands

```bash
# Run the application in dev mode
cargo tauri dev

# Build the application
cargo tauri build
```
