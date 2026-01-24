#![allow(dead_code)]

use anyhow::{Result, Context};
use std::process::Command;

/// Detects if the system is running Wayland or X11
fn is_wayland() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
}

/// Pastes text on Linux using xdotool (X11) or wtype (Wayland)
///
/// # Arguments
/// * `text` - The text to paste
///
/// # Returns
/// * `Ok(())` if the text was pasted successfully
/// * `Err` if the paste command failed
pub fn paste_text(text: &str) -> Result<()> {
    log::info!("Pasting text on Linux");

    if is_wayland() {
        paste_text_wayland(text)
    } else {
        paste_text_x11(text)
    }
}

/// Pastes text using xdotool on X11
fn paste_text_x11(text: &str) -> Result<()> {
    log::info!("Using xdotool for X11");

    // First, copy to clipboard using xclip
    let mut child = Command::new("xclip")
        .args(["-selection", "clipboard"])
        .stdin(std::process::Stdio::piped())
        .spawn()
        .context("Failed to spawn xclip")?;

    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        stdin.write_all(text.as_bytes())
            .context("Failed to write to xclip")?;
    }

    child.wait().context("Failed to wait for xclip")?;

    // Then paste using xdotool
    let output = Command::new("xdotool")
        .args(["key", "ctrl+v"])
        .output()
        .context("Failed to execute xdotool")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("xdotool failed: {}", error));
    }

    log::info!("Text pasted successfully using xdotool");
    Ok(())
}

/// Pastes text using wtype on Wayland
fn paste_text_wayland(text: &str) -> Result<()> {
    log::info!("Using wtype for Wayland");

    // First, copy to clipboard using wl-copy
    let mut child = Command::new("wl-copy")
        .stdin(std::process::Stdio::piped())
        .spawn()
        .context("Failed to spawn wl-copy")?;

    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        stdin.write_all(text.as_bytes())
            .context("Failed to write to wl-copy")?;
    }

    child.wait().context("Failed to wait for wl-copy")?;

    // Then paste using wtype
    let output = Command::new("wtype")
        .args(["-M", "ctrl", "v"])
        .output()
        .context("Failed to execute wtype")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("wtype failed: {}", error));
    }

    log::info!("Text pasted successfully using wtype");
    Ok(())
}
