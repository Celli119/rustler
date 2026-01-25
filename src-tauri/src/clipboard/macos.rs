use anyhow::{Context, Result};
use std::process::Command;

/// Pastes text on macOS using AppleScript
///
/// # Arguments
/// * `text` - The text to paste
///
/// # Returns
/// * `Ok(())` if the text was pasted successfully
/// * `Err` if the AppleScript command failed
pub fn paste_text(text: &str) -> Result<()> {
    log::info!("Pasting text on macOS using AppleScript");

    // Escape special characters for AppleScript
    let escaped_text = text
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r");

    // AppleScript to set clipboard and paste
    let script = format!(
        r#"
        set the clipboard to "{}"
        tell application "System Events"
            keystroke "v" using command down
        end tell
        "#,
        escaped_text
    );

    // Execute AppleScript
    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .context("Failed to execute osascript")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("AppleScript failed: {}", error));
    }

    log::info!("Text pasted successfully on macOS");
    Ok(())
}
