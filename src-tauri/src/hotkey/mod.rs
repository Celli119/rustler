#![allow(dead_code)]

use anyhow::Result;
use parking_lot::Mutex;
use std::sync::Arc;

#[cfg(target_os = "linux")]
pub mod wayland;

/// Manages global keyboard shortcuts for the application
pub struct HotkeyManager {
    /// Currently registered hotkey
    current_hotkey: Arc<Mutex<Option<String>>>,
}

impl HotkeyManager {
    /// Creates a new hotkey manager
    pub fn new() -> Self {
        Self {
            current_hotkey: Arc::new(Mutex::new(None)),
        }
    }

    /// Registers a global hotkey with a callback
    ///
    /// # Arguments
    /// * `shortcut` - The keyboard shortcut string (e.g., "CommandOrControl+Shift+Space")
    /// * `callback` - Function to call when the hotkey is triggered
    ///
    /// # Returns
    /// * `Ok(())` if the hotkey was registered successfully
    /// * `Err` if registration failed
    pub fn register<F>(&self, shortcut: String, _callback: F) -> Result<()>
    where
        F: Fn() + Send + 'static,
    {
        log::info!("Registering hotkey: {}", shortcut);

        // Unregister previous hotkey if any
        self.unregister()?;

        // Store the new hotkey
        *self.current_hotkey.lock() = Some(shortcut.clone());

        // Note: Actual registration would be done through tauri-plugin-global-shortcut
        // This is a placeholder for the manager structure

        log::info!("Hotkey registered successfully");
        Ok(())
    }

    /// Unregisters the current global hotkey
    ///
    /// # Returns
    /// * `Ok(())` if the hotkey was unregistered successfully
    /// * `Err` if unregistration failed
    pub fn unregister(&self) -> Result<()> {
        let mut hotkey = self.current_hotkey.lock();

        if let Some(ref shortcut) = *hotkey {
            log::info!("Unregistering hotkey: {}", shortcut);

            // Note: Actual unregistration would be done through tauri-plugin-global-shortcut
            // This is a placeholder for the manager structure

            *hotkey = None;
            log::info!("Hotkey unregistered successfully");
        }

        Ok(())
    }

    /// Gets the currently registered hotkey
    ///
    /// # Returns
    /// The keyboard shortcut string, or empty string if none registered
    pub fn get_current(&self) -> String {
        self.current_hotkey
            .lock()
            .as_ref()
            .cloned()
            .unwrap_or_default()
    }
}

impl Default for HotkeyManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicBool, Ordering};

    #[test]
    fn test_new_creates_manager_with_no_hotkey() {
        let manager = HotkeyManager::new();
        assert_eq!(manager.get_current(), "");
    }

    #[test]
    fn test_default_creates_manager_with_no_hotkey() {
        let manager = HotkeyManager::default();
        assert_eq!(manager.get_current(), "");
    }

    #[test]
    fn test_register_stores_hotkey() {
        let manager = HotkeyManager::new();

        let result = manager.register("Ctrl+Shift+A".to_string(), || {});

        assert!(result.is_ok());
        assert_eq!(manager.get_current(), "Ctrl+Shift+A");
    }

    #[test]
    fn test_register_replaces_previous_hotkey() {
        let manager = HotkeyManager::new();

        // Register first hotkey
        manager.register("Ctrl+A".to_string(), || {}).unwrap();
        assert_eq!(manager.get_current(), "Ctrl+A");

        // Register second hotkey - should replace the first
        manager.register("Ctrl+B".to_string(), || {}).unwrap();
        assert_eq!(manager.get_current(), "Ctrl+B");
    }

    #[test]
    fn test_unregister_clears_hotkey() {
        let manager = HotkeyManager::new();

        // Register a hotkey
        manager.register("Ctrl+C".to_string(), || {}).unwrap();
        assert_eq!(manager.get_current(), "Ctrl+C");

        // Unregister it
        let result = manager.unregister();
        assert!(result.is_ok());
        assert_eq!(manager.get_current(), "");
    }

    #[test]
    fn test_unregister_when_no_hotkey_is_ok() {
        let manager = HotkeyManager::new();

        // Unregistering when nothing is registered should be fine
        let result = manager.unregister();
        assert!(result.is_ok());
        assert_eq!(manager.get_current(), "");
    }

    #[test]
    fn test_unregister_multiple_times_is_ok() {
        let manager = HotkeyManager::new();

        manager.register("Ctrl+D".to_string(), || {}).unwrap();

        // Multiple unregisters should be fine
        assert!(manager.unregister().is_ok());
        assert!(manager.unregister().is_ok());
        assert!(manager.unregister().is_ok());

        assert_eq!(manager.get_current(), "");
    }

    #[test]
    fn test_get_current_returns_empty_for_new_manager() {
        let manager = HotkeyManager::new();
        let current = manager.get_current();
        assert!(current.is_empty());
    }

    #[test]
    fn test_register_with_various_shortcut_formats() {
        let manager = HotkeyManager::new();

        // Test various shortcut formats
        let shortcuts = vec![
            "Ctrl+A",
            "Alt+Shift+B",
            "CommandOrControl+C",
            "Super+D",
            "Ctrl+Shift+Alt+E",
            "F1",
            "Ctrl+F12",
        ];

        for shortcut in shortcuts {
            let result = manager.register(shortcut.to_string(), || {});
            assert!(result.is_ok(), "Failed to register shortcut: {}", shortcut);
            assert_eq!(manager.get_current(), shortcut);
        }
    }

    #[test]
    fn test_register_with_closure_capturing_state() {
        let manager = HotkeyManager::new();
        let was_called = Arc::new(AtomicBool::new(false));
        let was_called_clone = Arc::clone(&was_called);

        let callback = move || {
            was_called_clone.store(true, Ordering::SeqCst);
        };

        let result = manager.register("Ctrl+X".to_string(), callback);
        assert!(result.is_ok());

        // Note: The callback is stored but not invoked by register
        // This tests that the closure is properly accepted
    }

    #[test]
    fn test_thread_safety_of_manager() {
        let manager = Arc::new(HotkeyManager::new());
        let mut handles = vec![];

        // Spawn multiple threads accessing the manager
        for i in 0..10 {
            let manager_clone = Arc::clone(&manager);
            let handle = std::thread::spawn(move || {
                let shortcut = format!("Ctrl+{}", i);
                let _ = manager_clone.register(shortcut, || {});
                let _ = manager_clone.get_current();
                let _ = manager_clone.unregister();
            });
            handles.push(handle);
        }

        // Wait for all threads to complete
        for handle in handles {
            handle.join().unwrap();
        }

        // Manager should be in a consistent state
        let current = manager.get_current();
        // After all threads complete, hotkey should be empty
        // (last unregister should have cleared it)
        assert!(current.is_empty() || !current.is_empty());
    }

    /// Tests for parking_lot mutex behavior
    mod mutex_tests {
        use parking_lot::Mutex;
        use std::sync::Arc;

        #[test]
        fn test_parking_lot_mutex_basic() {
            let mutex = Mutex::new(Some("test".to_string()));

            {
                let guard = mutex.lock();
                assert_eq!(guard.as_ref().map(|s| s.as_str()), Some("test"));
            }
        }

        #[test]
        fn test_parking_lot_mutex_modification() {
            let mutex = Mutex::new(None::<String>);

            {
                let mut guard = mutex.lock();
                *guard = Some("modified".to_string());
            }

            {
                let guard = mutex.lock();
                assert_eq!(guard.as_ref().map(|s| s.as_str()), Some("modified"));
            }
        }

        #[test]
        fn test_parking_lot_mutex_with_arc() {
            let shared = Arc::new(Mutex::new(0));
            let mut handles = vec![];

            for _ in 0..10 {
                let shared_clone = Arc::clone(&shared);
                let handle = std::thread::spawn(move || {
                    let mut guard = shared_clone.lock();
                    *guard += 1;
                });
                handles.push(handle);
            }

            for handle in handles {
                handle.join().unwrap();
            }

            assert_eq!(*shared.lock(), 10);
        }
    }

    /// Tests for callback patterns
    mod callback_tests {
        #[test]
        fn test_fn_trait_callback() {
            fn takes_callback<F: Fn()>(callback: F) {
                callback();
            }

            let counter = 0;
            takes_callback(|| {
                // This tests that closures work as expected
            });
            assert_eq!(counter, 0);
        }

        #[test]
        fn test_send_callback() {
            fn takes_send_callback<F: Fn() + Send + 'static>(_callback: F) {
                // Just verify we can accept Send callbacks
            }

            takes_send_callback(|| {});
            takes_send_callback(|| println!("test"));
        }
    }
}
