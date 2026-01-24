use anyhow::Result;

// Platform-specific clipboard implementations
#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "windows")]
mod windows;

/// Pastes text to the active application using platform-specific methods
///
/// # Arguments
/// * `text` - The text to paste
///
/// # Returns
/// * `Ok(())` if the text was pasted successfully
/// * `Err` if pasting failed
#[allow(dead_code)]
pub fn paste_text(text: &str) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        macos::paste_text(text)
    }

    #[cfg(target_os = "linux")]
    {
        linux::paste_text(text)
    }

    #[cfg(target_os = "windows")]
    {
        windows::paste_text(text)
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        Err(anyhow::anyhow!("Clipboard paste not supported on this platform"))
    }
}
