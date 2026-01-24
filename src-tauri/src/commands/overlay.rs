//! Commands for controlling the overlay window

use tauri::{AppHandle, Manager};

/// Sets whether the overlay window should ignore cursor events (click-through)
///
/// When `ignore` is true, mouse clicks pass through the window.
/// When `ignore` is false, the window receives mouse events normally.
#[tauri::command]
pub async fn set_overlay_ignore_cursor_events(app: AppHandle, ignore: bool) -> Result<(), String> {
    log::info!("Setting overlay ignore_cursor_events: {}", ignore);

    if let Some(window) = app.get_webview_window("overlay") {
        window
            .set_ignore_cursor_events(ignore)
            .map_err(|e| format!("Failed to set ignore_cursor_events: {}", e))?;
        Ok(())
    } else {
        Err("Overlay window not found".to_string())
    }
}

/// Moves the overlay window to a new position
#[tauri::command]
pub async fn move_overlay_window(app: AppHandle, x: i32, y: i32) -> Result<(), String> {
    log::info!("Moving overlay window to ({}, {})", x, y);

    if let Some(window) = app.get_webview_window("overlay") {
        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
            .map_err(|e| format!("Failed to move window: {}", e))?;
        Ok(())
    } else {
        Err("Overlay window not found".to_string())
    }
}

/// Gets the current position of the overlay window
#[tauri::command]
pub async fn get_overlay_position(app: AppHandle) -> Result<(i32, i32), String> {
    if let Some(window) = app.get_webview_window("overlay") {
        let pos = window
            .outer_position()
            .map_err(|e| format!("Failed to get position: {}", e))?;
        Ok((pos.x, pos.y))
    } else {
        Err("Overlay window not found".to_string())
    }
}
