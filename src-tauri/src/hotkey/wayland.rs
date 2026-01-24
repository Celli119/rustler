//! Wayland global shortcuts implementation using xdg-desktop-portal via ashpd
//!
//! This module provides global hotkey support on Wayland compositors that implement
//! the GlobalShortcuts portal (GNOME, KDE Plasma, Hyprland, etc.)
//!
//! Note: On GNOME, when registering a shortcut, a dialog appears asking the user
//! to configure the shortcut. The timeout is set to 60 seconds to allow time for
//! user interaction.

use ashpd::desktop::global_shortcuts::{GlobalShortcuts, NewShortcut};
use parking_lot::Mutex;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::mpsc;

/// Flag to track if we've already detected that GlobalShortcuts is unavailable
static PORTAL_UNAVAILABLE: AtomicBool = AtomicBool::new(false);

/// Flag to prevent concurrent registration attempts
static REGISTRATION_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

/// Manages global shortcuts on Wayland via xdg-desktop-portal
pub struct WaylandHotkeyManager {
    /// Channel to send shutdown signal to the listener task
    shutdown_tx: Arc<Mutex<Option<mpsc::Sender<()>>>>,
}

impl WaylandHotkeyManager {
    /// Creates a new Wayland hotkey manager
    pub fn new() -> Self {
        Self {
            shutdown_tx: Arc::new(Mutex::new(None)),
        }
    }

    /// Registers a global shortcut and starts listening for activation events
    ///
    /// # Arguments
    /// * `shortcut_id` - Unique identifier for the shortcut (e.g., "record-toggle")
    /// * `description` - Human-readable description (e.g., "Toggle Recording")
    /// * `preferred_trigger` - Preferred key combination (e.g., "Alt+E")
    /// * `callback` - Function to call when the shortcut is activated
    pub async fn register<F>(
        &self,
        shortcut_id: &str,
        description: &str,
        preferred_trigger: &str,
        callback: F,
    ) -> Result<(), String>
    where
        F: Fn() + Send + Sync + 'static,
    {
        log::info!(
            "Wayland: Registering shortcut '{}' with trigger '{}'",
            shortcut_id,
            preferred_trigger
        );

        // Check if we've already determined the portal is unavailable
        if PORTAL_UNAVAILABLE.load(Ordering::Relaxed) {
            return Err("GlobalShortcuts portal is not available on this system. Global hotkeys are not supported on Wayland with your current desktop environment. Please use the in-app recording button instead.".to_string());
        }

        // Prevent concurrent registration attempts (React Strict Mode can cause duplicate calls)
        if REGISTRATION_IN_PROGRESS.compare_exchange(
            false,
            true,
            Ordering::SeqCst,
            Ordering::SeqCst
        ).is_err() {
            log::warn!("Wayland: Registration already in progress, skipping duplicate call");
            return Ok(());
        }

        // Ensure we reset the flag when done (using a guard pattern)
        struct RegistrationGuard;
        impl Drop for RegistrationGuard {
            fn drop(&mut self) {
                REGISTRATION_IN_PROGRESS.store(false, Ordering::SeqCst);
            }
        }
        let _guard = RegistrationGuard;

        // Stop any existing listener
        self.stop_listener();

        // Create the portal proxy with timeout (5 seconds should be enough for connection)
        let shortcuts = tokio::time::timeout(
            std::time::Duration::from_secs(5),
            GlobalShortcuts::new()
        )
        .await
        .map_err(|_| {
            PORTAL_UNAVAILABLE.store(true, Ordering::Relaxed);
            log::warn!("Wayland: GlobalShortcuts portal timed out - marking as unavailable");
            "GlobalShortcuts portal not available (timeout). Your desktop environment may not support global shortcuts via xdg-desktop-portal. Please use the in-app recording button instead.".to_string()
        })?
        .map_err(|e| {
            PORTAL_UNAVAILABLE.store(true, Ordering::Relaxed);
            log::warn!("Wayland: GlobalShortcuts portal error - marking as unavailable: {}", e);
            format!("Failed to connect to GlobalShortcuts portal: {}. Please use the in-app recording button instead.", e)
        })?;

        // Create a new session with timeout
        let session = tokio::time::timeout(
            std::time::Duration::from_secs(5),
            shortcuts.create_session()
        )
        .await
        .map_err(|_| {
            PORTAL_UNAVAILABLE.store(true, Ordering::Relaxed);
            log::warn!("Wayland: create_session timed out - marking as unavailable");
            "GlobalShortcuts portal timed out. Please use the in-app recording button instead.".to_string()
        })?
        .map_err(|e| {
            PORTAL_UNAVAILABLE.store(true, Ordering::Relaxed);
            log::warn!("Wayland: create_session failed - marking as unavailable: {}", e);
            format!("Failed to create shortcuts session: {}. Please use the in-app recording button instead.", e)
        })?;

        // Define the shortcut
        let new_shortcut = NewShortcut::new(shortcut_id, description)
            .preferred_trigger(preferred_trigger);

        log::info!("Wayland: A system dialog may appear - please configure the shortcut in the dialog");

        // Bind the shortcut to the session (None for window identifier)
        // Timeout is 60 seconds because GNOME shows a dialog that requires user interaction
        let request = tokio::time::timeout(
            std::time::Duration::from_secs(60),
            shortcuts.bind_shortcuts(&session, &[new_shortcut], None)
        )
        .await
        .map_err(|_| {
            // Don't mark as unavailable - timeout just means user didn't respond to dialog
            log::warn!("Wayland: bind_shortcuts timed out - user may have dismissed the dialog");
            "Shortcut configuration timed out. If a dialog appeared, please try again and configure the shortcut in the system dialog.".to_string()
        })?
        .map_err(|e| {
            log::warn!("Wayland: bind_shortcuts failed: {}", e);
            format!("Failed to bind shortcut: {}. Please use the in-app recording button instead.", e)
        })?;

        // Get the response (not async)
        let _response = request
            .response()
            .map_err(|e| {
                // "Other" error usually means user cancelled the dialog
                let error_str = e.to_string();
                if error_str.contains("Other") {
                    log::warn!("Wayland: User cancelled or dismissed the shortcut configuration dialog");
                    "Shortcut configuration was cancelled. Please try again and configure the shortcut in the system dialog that appears.".to_string()
                } else {
                    log::warn!("Wayland: response failed: {}", e);
                    format!("Failed to get bind response: {}. Please use the in-app recording button instead.", e)
                }
            })?;

        log::info!("Wayland: Shortcut bound successfully, starting listener...");

        // Create shutdown channel
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);
        *self.shutdown_tx.lock() = Some(shutdown_tx);

        // Clone shortcut_id for the async task
        let shortcut_id_owned = shortcut_id.to_string();
        let callback = Arc::new(callback);

        // Spawn task to listen for activation events
        tokio::spawn(async move {
            let activated_stream = match shortcuts.receive_activated().await {
                Ok(stream) => stream,
                Err(e) => {
                    log::error!("Wayland: Failed to receive activated stream: {}", e);
                    return;
                }
            };

            use futures_util::StreamExt;
            let mut activated_stream = std::pin::pin!(activated_stream);

            loop {
                tokio::select! {
                    Some(activated) = activated_stream.next() => {
                        log::info!("Wayland: Shortcut activated: {}", activated.shortcut_id());
                        if activated.shortcut_id() == shortcut_id_owned {
                            log::info!("Wayland: Shortcut '{}' triggered!", shortcut_id_owned);
                            callback();
                        }
                    }
                    _ = shutdown_rx.recv() => {
                        log::info!("Wayland: Shutdown signal received, stopping listener");
                        break;
                    }
                }
            }

            log::info!("Wayland: Listener task ended");
        });

        log::info!("Wayland: Hotkey registered successfully");
        Ok(())
    }

    /// Stops the listener task
    fn stop_listener(&self) {
        if let Some(tx) = self.shutdown_tx.lock().take() {
            // Try to send shutdown signal (ignore if receiver is gone)
            let _ = tx.try_send(());
            log::info!("Wayland: Sent shutdown signal to listener");
        }
    }

    /// Unregisters the current shortcut and stops the listener
    pub fn unregister(&self) {
        self.stop_listener();
    }

    /// Check if we're running on Wayland
    pub fn is_wayland() -> bool {
        std::env::var("WAYLAND_DISPLAY").is_ok()
            || std::env::var("XDG_SESSION_TYPE")
                .map(|v| v == "wayland")
                .unwrap_or(false)
    }
}

impl Default for WaylandHotkeyManager {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for WaylandHotkeyManager {
    fn drop(&mut self) {
        self.stop_listener();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_wayland_detection() {
        // This test just verifies the function doesn't panic
        let _ = WaylandHotkeyManager::is_wayland();
    }

    #[test]
    fn test_new_creates_manager() {
        let manager = WaylandHotkeyManager::new();
        assert!(manager.shutdown_tx.lock().is_none());
    }
}
