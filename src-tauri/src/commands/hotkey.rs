use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[cfg(target_os = "linux")]
use crate::hotkey::wayland::{WaylandHotkeyManager, reset_portal_state};
#[cfg(target_os = "linux")]
use std::sync::OnceLock;

/// Global Wayland hotkey manager (Linux only)
#[cfg(target_os = "linux")]
static WAYLAND_MANAGER: OnceLock<WaylandHotkeyManager> = OnceLock::new();

#[cfg(target_os = "linux")]
fn get_wayland_manager() -> &'static WaylandHotkeyManager {
    WAYLAND_MANAGER.get_or_init(WaylandHotkeyManager::new)
}

/// Check if we're running on Wayland (Linux only)
#[cfg(target_os = "linux")]
fn is_wayland() -> bool {
    WaylandHotkeyManager::is_wayland()
}

#[cfg(not(target_os = "linux"))]
fn is_wayland() -> bool {
    false
}

/// Registers a global hotkey for triggering recording
///
/// # Arguments
/// * `app` - Tauri app handle
/// * `shortcut` - The keyboard shortcut string (e.g., "Alt+R", "Ctrl+Shift+Space")
///
/// # Returns
/// * `Ok(())` if the hotkey was registered successfully
/// * `Err(String)` if registration failed
#[tauri::command]
pub async fn register_hotkey(app: AppHandle, shortcut: String) -> Result<(), String> {
    log::info!("Registering hotkey: {}", shortcut);

    // On Linux with Wayland, use xdg-desktop-portal
    #[cfg(target_os = "linux")]
    if is_wayland() {
        log::info!("Detected Wayland session, using xdg-desktop-portal for global shortcuts");
        return register_hotkey_wayland(app, shortcut).await;
    }

    // Use tauri-plugin-global-shortcut for X11/macOS/Windows
    register_hotkey_native(app, shortcut)
}

/// Register hotkey using Wayland portal (Linux only)
#[cfg(target_os = "linux")]
async fn register_hotkey_wayland(app: AppHandle, shortcut: String) -> Result<(), String> {
    let manager = get_wayland_manager();

    // Create callback that emits event to frontend
    let callback = move || {
        log::info!("Wayland hotkey triggered!");
        if let Some(window) = app.get_webview_window("main") {
            log::info!("Emitting hotkey-triggered event to window");
            let _ = window.emit("hotkey-triggered", ());
        } else {
            log::warn!("Could not find main window!");
        }
    };

    // Register the shortcut
    manager
        .register("record-toggle", "Toggle Recording", &shortcut, callback)
        .await?;

    log::info!("Wayland hotkey registered successfully: {}", shortcut);
    Ok(())
}

/// Register hotkey using native tauri plugin (X11/macOS/Windows)
fn register_hotkey_native(app: AppHandle, shortcut: String) -> Result<(), String> {
    let shortcut_manager = app.global_shortcut();

    // Unregister all existing shortcuts first
    shortcut_manager
        .unregister_all()
        .map_err(|e| format!("Failed to unregister existing hotkeys: {}", e))?;

    // Parse the shortcut string
    let parsed_shortcut: Shortcut = shortcut
        .parse()
        .map_err(|e| format!("Invalid shortcut format '{}': {}", shortcut, e))?;

    // Clone app handle for the callback
    let app_handle = app.clone();

    // Register the new shortcut
    shortcut_manager
        .on_shortcut(parsed_shortcut, move |_app, shortcut, event| {
            log::info!(
                "Shortcut callback fired! shortcut={:?}, state={:?}",
                shortcut,
                event.state
            );
            // Only trigger on key press, not release
            if event.state == ShortcutState::Pressed {
                log::info!("Hotkey triggered (Pressed)!");
                // Emit event to frontend
                if let Some(window) = app_handle.get_webview_window("main") {
                    log::info!("Emitting hotkey-triggered event to window");
                    let _ = window.emit("hotkey-triggered", ());
                } else {
                    log::warn!("Could not find main window!");
                }
            }
        })
        .map_err(|e| format!("Failed to register hotkey: {}", e))?;

    log::info!("Native hotkey registered successfully: {}", shortcut);
    Ok(())
}

/// Check if we're running on Wayland (exposed to frontend)
#[tauri::command]
pub fn is_wayland_session() -> bool {
    is_wayland()
}

/// Reset Wayland portal state and re-register hotkey
/// This forces the xdg-desktop-portal dialog to appear again
#[tauri::command]
pub async fn reset_wayland_hotkey(app: AppHandle, shortcut: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if is_wayland() {
        log::info!("Resetting Wayland portal state and re-registering hotkey");
        reset_portal_state();
        return register_hotkey_wayland(app, shortcut).await;
    }

    // On non-Wayland, just do normal registration
    register_hotkey(app, shortcut).await
}

/// Unregisters all global hotkeys
#[tauri::command]
pub async fn unregister_hotkeys(app: AppHandle) -> Result<(), String> {
    log::info!("Unregistering all hotkeys");

    // On Linux with Wayland, unregister from portal
    #[cfg(target_os = "linux")]
    if is_wayland() {
        let manager = get_wayland_manager();
        manager.unregister();
        log::info!("Wayland hotkeys unregistered");
        return Ok(());
    }

    // Native unregister
    let shortcut_manager = app.global_shortcut();
    shortcut_manager
        .unregister_all()
        .map_err(|e| format!("Failed to unregister hotkeys: {}", e))?;

    log::info!("All hotkeys unregistered");
    Ok(())
}
