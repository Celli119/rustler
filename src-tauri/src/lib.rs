// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// Treat warnings as errors
#![deny(warnings)]

use parking_lot::Mutex;
use std::sync::Arc;
use tauri::{Manager, WindowEvent};

// Module declarations
mod commands;
mod whisper;
mod audio;
mod clipboard;
mod hotkey;
mod models;

/// Application state shared across all Tauri commands
#[derive(Default)]
pub struct AppState {
    /// Current recording handle
    recording: Mutex<Option<audio::recorder::RecordingHandle>>,
    /// Whisper context for transcription (reserved for future use)
    #[allow(dead_code)]
    whisper_context: Mutex<Option<whisper::context::WhisperContext>>,
    /// Hotkey manager (reserved for future use)
    #[allow(dead_code)]
    hotkey_manager: Mutex<Option<hotkey::HotkeyManager>>,
}

/// Main entry point for the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Setup logging
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Setup global shortcut plugin
            app.handle().plugin(tauri_plugin_global_shortcut::Builder::new().build())?;

            // Setup positioner plugin for window positioning
            app.handle().plugin(tauri_plugin_positioner::init())?;

            // Initialize app state
            app.manage(Arc::new(AppState::default()));

            // Start the model cache cleanup task (unloads models after 5 min of inactivity)
            whisper::cache::start_cleanup_task();

            // Setup system tray icon
            #[cfg(desktop)]
            {
                use tauri::tray::{TrayIconBuilder, TrayIconEvent};

                let _tray = TrayIconBuilder::new()
                    .tooltip("Rustler")
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click { .. } = event {
                            if let Some(window) = tray.app_handle().get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;
            }

            // Configure overlay window
            if let Some(overlay) = app.get_webview_window("overlay") {
                // Set GTK window properties on Linux for proper always-on-top behavior
                #[cfg(target_os = "linux")]
                {
                    use gtk::prelude::GtkWindowExt;

                    if let Ok(gtk_window) = overlay.gtk_window() {
                        // Keep above other windows (works on X11)
                        gtk_window.set_keep_above(true);
                        // Make it stick to all workspaces
                        gtk_window.stick();
                        log::info!("Set GTK window hints for overlay (keep_above, stick)");
                    }
                }

                // Dynamically detect monitors and position on the leftmost one
                // TODO: Add setting to choose which monitor to use
                if let Ok(monitors) = overlay.available_monitors() {
                    // Find the leftmost monitor (smallest x position)
                    if let Some(target_mon) = monitors.iter().min_by_key(|m| m.position().x) {
                        let size = target_mon.size();
                        let pos = target_mon.position();
                        // Position at bottom-right with margin
                        let pos_x = pos.x + size.width as i32 - 200; // 200px from right edge
                        let pos_y = pos.y + size.height as i32 - 150; // 150px from bottom
                        let _ = overlay.set_position(tauri::PhysicalPosition { x: pos_x, y: pos_y });
                        log::info!("Positioned overlay at ({}, {}) on monitor {}x{} at ({}, {})",
                            pos_x, pos_y, size.width, size.height, pos.x, pos.y);
                    } else {
                        // Fallback if no monitors detected
                        let _ = overlay.set_position(tauri::PhysicalPosition { x: 100, y: 100 });
                        log::warn!("No monitors detected, using fallback position");
                    }
                }

                // Force show the overlay window
                let _ = overlay.show();
                let _ = overlay.set_focus();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // When main window is closed, close the entire app (including overlay)
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { .. } = event {
                    // Exit the app when main window is closed
                    window.app_handle().exit(0);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Recording commands
            commands::recording::start_recording,
            commands::recording::stop_recording,
            // Transcription commands
            commands::transcription::transcribe_audio,
            // Settings commands
            commands::settings::get_settings,
            commands::settings::save_settings,
            // Model management commands
            commands::models::get_available_models,
            commands::models::download_model,
            commands::models::delete_model,
            commands::models::get_models_dir,
            // Hotkey commands
            commands::hotkey::register_hotkey,
            commands::hotkey::unregister_hotkeys,
            // Clipboard commands
            commands::clipboard::paste_text,
            // Overlay commands
            commands::overlay::set_overlay_ignore_cursor_events,
            commands::overlay::move_overlay_window,
            commands::overlay::get_overlay_position,
            // History commands
            commands::history::get_history,
            commands::history::add_history,
            commands::history::delete_history_entry,
            commands::history::clear_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
