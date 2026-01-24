use crate::clipboard;

/// Pastes text to the active application
///
/// # Arguments
/// * `text` - The text to paste at the current cursor position
///
/// # Returns
/// * `Ok(())` if the text was pasted successfully
/// * `Err(String)` if pasting failed
#[tauri::command]
pub fn paste_text(text: String) -> Result<(), String> {
    log::info!("Pasting text: {}...", &text[..text.len().min(50)]);
    clipboard::paste_text(&text).map_err(|e| format!("Failed to paste text: {}", e))
}
