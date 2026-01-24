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

    let display = std::env::var("DISPLAY").unwrap_or_else(|_| ":0".to_string());

    // First, copy to clipboard using xclip
    let mut child = Command::new("xclip")
        .args(["-selection", "clipboard"])
        .env("DISPLAY", &display)
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
        .env("DISPLAY", &display)
        .output()
        .context("Failed to execute xdotool")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("xdotool failed: {}", error));
    }

    log::info!("Text pasted successfully using xdotool");
    Ok(())
}

/// Pastes text on Wayland, handling both native Wayland and XWayland apps
fn paste_text_wayland(text: &str) -> Result<()> {
    log::info!("Using Wayland paste with XWayland support");

    // Copy to both Wayland and X11 clipboards for compatibility
    copy_to_wayland_clipboard(text)?;
    copy_to_x11_clipboard(text);  // Best effort, don't fail if xclip missing

    // Try wtype first (native Wayland), fall back to xdotool (XWayland)
    if let Err(wtype_err) = simulate_paste_wtype() {
        log::warn!("wtype failed ({}), trying xdotool for XWayland", wtype_err);
        simulate_paste_xdotool()?;
    }

    log::info!("Text pasted successfully");
    Ok(())
}

/// Copy text to Wayland clipboard using wl-copy
fn copy_to_wayland_clipboard(text: &str) -> Result<()> {
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
    log::info!("Copied to Wayland clipboard");
    Ok(())
}

/// Copy text to X11 clipboard using xclip (for XWayland apps)
fn copy_to_x11_clipboard(text: &str) {
    let result = (|| -> Result<()> {
        let mut child = Command::new("xclip")
            .args(["-selection", "clipboard"])
            .env("DISPLAY", std::env::var("DISPLAY").unwrap_or_else(|_| ":0".to_string()))
            .stdin(std::process::Stdio::piped())
            .spawn()
            .context("Failed to spawn xclip")?;

        if let Some(mut stdin) = child.stdin.take() {
            use std::io::Write;
            stdin.write_all(text.as_bytes())
                .context("Failed to write to xclip")?;
        }

        child.wait().context("Failed to wait for xclip")?;
        log::info!("Copied to X11 clipboard");
        Ok(())
    })();

    if let Err(e) = result {
        log::warn!("Failed to copy to X11 clipboard: {}", e);
    }
}

/// Simulate Ctrl+V using wtype (native Wayland)
fn simulate_paste_wtype() -> Result<()> {
    let output = Command::new("wtype")
        .args(["-M", "ctrl", "v", "-m", "ctrl"])
        .output()
        .context("Failed to execute wtype")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("wtype failed: {}", error));
    }

    Ok(())
}

/// Simulate Ctrl+V using xdotool (XWayland apps)
fn simulate_paste_xdotool() -> Result<()> {
    let output = Command::new("xdotool")
        .args(["key", "ctrl+v"])
        .env("DISPLAY", std::env::var("DISPLAY").unwrap_or_else(|_| ":0".to_string()))
        .output()
        .context("Failed to execute xdotool")?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("xdotool failed: {}", error));
    }

    Ok(())
}
