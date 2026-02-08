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
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;

/// Flag to track if we've already detected that GlobalShortcuts is unavailable
static PORTAL_UNAVAILABLE: AtomicBool = AtomicBool::new(false);

/// Flag to prevent concurrent registration attempts
static REGISTRATION_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

/// Reset the portal unavailable flag to allow re-trying registration
/// This should be called when the user explicitly wants to re-configure the hotkey
pub fn reset_portal_state() {
    PORTAL_UNAVAILABLE.store(false, Ordering::Relaxed);
    log::info!("Wayland: Portal unavailable flag reset, will retry on next registration");
}

/// Clear stored shortcuts for our app from GNOME dconf.
/// This forces the GNOME shortcuts configuration dialog to reappear on the next
/// bind_shortcuts call, since GNOME auto-approves shortcuts it already knows about.
pub fn clear_stored_shortcuts(app_id: &str) {
    let dconf_path = format!("/org/gnome/settings-daemon/global-shortcuts/{app_id}/");
    log::info!(
        "Wayland: Clearing stored shortcuts from dconf at {}",
        dconf_path
    );
    match std::process::Command::new("dconf")
        .args(["reset", "-f", &dconf_path])
        .output()
    {
        Ok(output) => {
            if output.status.success() {
                log::info!("Wayland: Cleared stored shortcuts from dconf");
            } else {
                log::warn!(
                    "Wayland: dconf reset failed: {}",
                    String::from_utf8_lossy(&output.stderr)
                );
            }
        }
        Err(e) => {
            log::warn!("Wayland: Failed to run dconf: {}", e);
        }
    }
}

/// Manages global shortcuts on Wayland via xdg-desktop-portal
pub struct WaylandHotkeyManager {
    /// Channel to send shutdown signal to the listener task
    shutdown_tx: Arc<Mutex<Option<mpsc::Sender<()>>>>,
    /// Handle to the spawned listener task so we can await its termination
    listener_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
}

impl WaylandHotkeyManager {
    /// Creates a new Wayland hotkey manager
    pub fn new() -> Self {
        Self {
            shutdown_tx: Arc::new(Mutex::new(None)),
            listener_handle: Arc::new(Mutex::new(None)),
        }
    }

    /// Registers a global shortcut and starts listening for activation events
    ///
    /// # Arguments
    /// * `shortcut_id` - Unique identifier for the shortcut (e.g., "record-toggle")
    /// * `description` - Human-readable description (e.g., "Toggle Recording")
    /// * `preferred_trigger` - Preferred key combination (e.g., "Alt+E")
    /// * `callback` - Function to call when the shortcut is activated
    ///
    /// Returns the actual trigger description from the GNOME dialog if available.
    pub async fn register<F>(
        &self,
        shortcut_id: &str,
        description: &str,
        preferred_trigger: &str,
        callback: F,
    ) -> Result<Option<String>, String>
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
        if REGISTRATION_IN_PROGRESS
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            log::warn!("Wayland: Registration already in progress, rejecting duplicate call");
            return Err("Registration already in progress, please wait for the current registration to complete.".to_string());
        }

        // Ensure we reset the flag when done (using a guard pattern)
        struct RegistrationGuard;
        impl Drop for RegistrationGuard {
            fn drop(&mut self) {
                REGISTRATION_IN_PROGRESS.store(false, Ordering::SeqCst);
            }
        }
        let _guard = RegistrationGuard;

        // Stop any existing listener and wait for it to fully terminate.
        // This ensures the old GlobalShortcuts proxy and D-Bus session are dropped
        // before we create new ones, preventing GNOME from auto-approving bind_shortcuts.
        self.stop_listener_and_wait().await;

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
        let new_shortcut =
            NewShortcut::new(shortcut_id, description).preferred_trigger(preferred_trigger);

        log::info!(
            "Wayland: A system dialog may appear - please configure the shortcut in the dialog"
        );

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

        // Get the response which contains the actual bound shortcuts
        let response = request
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

        // Extract the actual trigger description from the response — this is what
        // the user chose in the GNOME dialog, which may differ from preferred_trigger
        let actual_trigger = response
            .shortcuts()
            .iter()
            .find(|s| s.id() == shortcut_id)
            .map(|s| s.trigger_description().to_string());

        if let Some(ref trigger) = actual_trigger {
            log::info!(
                "Wayland: Shortcut bound successfully with trigger: {}",
                trigger
            );
        } else {
            log::info!("Wayland: Shortcut bound successfully (no trigger description in response)");
        }

        // Create shutdown channel
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);
        *self.shutdown_tx.lock() = Some(shutdown_tx);

        // Create oneshot channel so the listener task can confirm it's ready
        let (ready_tx, ready_rx) = tokio::sync::oneshot::channel::<Result<(), String>>();

        // Clone shortcut_id for the async task
        let shortcut_id_owned = shortcut_id.to_string();
        let callback = Arc::new(callback);

        // Spawn task to listen for activation events.
        // The session is moved into the task so it stays alive for the duration
        // of the listener, and is explicitly closed on shutdown. Without this,
        // the portal session becomes a zombie (Session has no Drop impl) and
        // GNOME will auto-approve subsequent bind_shortcuts without showing
        // the configuration dialog.
        let handle = tokio::spawn(async move {
            let activated_stream = match shortcuts.receive_activated().await {
                Ok(stream) => {
                    let _ = ready_tx.send(Ok(()));
                    stream
                }
                Err(e) => {
                    log::error!("Wayland: Failed to receive activated stream: {}", e);
                    let _ = ready_tx.send(Err(format!("Failed to start shortcut listener: {}", e)));
                    // Close the session before returning since we won't be listening
                    if let Err(e) = session.close().await {
                        log::warn!("Wayland: Failed to close session on error path: {}", e);
                    }
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

            // Explicitly close the portal session so GNOME knows to clean it up.
            // This is critical: without it, the old session persists and GNOME
            // will auto-approve the next bind_shortcuts without showing the dialog.
            log::info!("Wayland: Closing portal session...");
            if let Err(e) = session.close().await {
                log::warn!("Wayland: Failed to close portal session: {}", e);
            } else {
                log::info!("Wayland: Portal session closed successfully");
            }

            log::info!("Wayland: Listener task ended");
        });

        // Store the handle so we can await it during shutdown
        *self.listener_handle.lock() = Some(handle);

        // Wait for listener to confirm it's ready (with timeout)
        match tokio::time::timeout(std::time::Duration::from_secs(5), ready_rx).await {
            Ok(Ok(Ok(()))) => {
                log::info!("Wayland: Hotkey registered and listener confirmed ready");
            }
            Ok(Ok(Err(e))) => {
                return Err(e);
            }
            Ok(Err(_)) => {
                return Err(
                    "Listener task exited unexpectedly before confirming readiness.".to_string(),
                );
            }
            Err(_) => {
                log::warn!("Wayland: Listener readiness confirmation timed out, proceeding anyway");
            }
        }

        Ok(actual_trigger)
    }

    /// Sends shutdown signal and awaits the listener task to fully terminate.
    /// This ensures the old portal session is closed and the D-Bus proxy is dropped
    /// before creating a new session, preventing GNOME from auto-approving bind_shortcuts.
    async fn stop_listener_and_wait(&self) {
        let tx = self.shutdown_tx.lock().take();
        let handle = self.listener_handle.lock().take();

        if let Some(tx) = tx {
            let _ = tx.try_send(());
            log::info!("Wayland: Sent shutdown signal to listener");
        }

        if let Some(handle) = handle {
            // Use tokio::pin so we can abort the handle if the timeout fires
            let abort_handle = handle.abort_handle();
            match tokio::time::timeout(std::time::Duration::from_secs(5), handle).await {
                Ok(Ok(())) => {
                    log::info!("Wayland: Previous listener task terminated cleanly");
                }
                Ok(Err(e)) => {
                    log::warn!("Wayland: Previous listener task panicked: {}", e);
                }
                Err(_) => {
                    // Task didn't stop in time — abort it to force-drop the session/proxy
                    log::warn!("Wayland: Timed out waiting for previous listener, aborting task");
                    abort_handle.abort();
                }
            }
        }
    }

    /// Stops the listener task (sync, best-effort — used in Drop and unregister)
    fn stop_listener(&self) {
        if let Some(tx) = self.shutdown_tx.lock().take() {
            let _ = tx.try_send(());
            log::info!("Wayland: Sent shutdown signal to listener");
        }
        // Take the handle to allow the task to be cleaned up, but don't await it
        let _ = self.listener_handle.lock().take();
    }

    /// Unregisters the current shortcut and stops the listener
    pub fn unregister(&self) {
        self.stop_listener();
    }

    /// Check if we're running on Wayland or XWayland
    /// On Wayland sessions (including XWayland), we need to use the portal for global shortcuts
    pub fn is_wayland() -> bool {
        // Direct Wayland connection
        let has_wayland_display = std::env::var("WAYLAND_DISPLAY").is_ok();

        // Session type is Wayland (covers both native Wayland and XWayland apps)
        let is_wayland_session = std::env::var("XDG_SESSION_TYPE")
            .map(|v| v == "wayland")
            .unwrap_or(false);

        // Check for common Wayland compositors via XDG_CURRENT_DESKTOP
        let is_wayland_desktop = std::env::var("XDG_CURRENT_DESKTOP")
            .map(|v| {
                let v = v.to_lowercase();
                v.contains("gnome")
                    || v.contains("kde")
                    || v.contains("sway")
                    || v.contains("hyprland")
                    || v.contains("wlroots")
            })
            .unwrap_or(false);

        let result = has_wayland_display
            || is_wayland_session
            || (is_wayland_desktop && std::env::var("DISPLAY").is_err());

        log::info!(
            "Wayland detection: WAYLAND_DISPLAY={}, XDG_SESSION_TYPE=wayland: {}, wayland_desktop: {} -> {}",
            has_wayland_display, is_wayland_session, is_wayland_desktop, result
        );

        result
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
        assert!(manager.listener_handle.lock().is_none());
    }
}
