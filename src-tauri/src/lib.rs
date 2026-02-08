// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// Treat warnings as errors
#![deny(warnings)]

use parking_lot::Mutex;
use std::sync::Arc;
use tauri::{Manager, WindowEvent};

// Module declarations
mod audio;
mod clipboard;
mod commands;
mod hotkey;
mod models;
mod whisper;

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
            app.handle()
                .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;

            // Setup positioner plugin for window positioning
            app.handle().plugin(tauri_plugin_positioner::init())?;

            // Setup process plugin for restart functionality
            app.handle().plugin(tauri_plugin_process::init())?;

            // Setup notification plugin for recording notifications
            app.handle().plugin(tauri_plugin_notification::init())?;

            // Initialize app state
            app.manage(Arc::new(AppState::default()));

            // Start the model cache cleanup task (unloads models after 5 min of inactivity)
            whisper::cache::start_cleanup_task();

            // Setup system tray icon with menu
            #[cfg(desktop)]
            {
                use tauri::image::Image;
                use tauri::menu::{MenuBuilder, MenuItemBuilder};
                use tauri::tray::{TrayIconBuilder, TrayIconEvent};

                let tray_icon = Image::from_bytes(include_bytes!("../icons/32x32.png"))
                    .expect("Failed to load tray icon");

                let show_item = MenuItemBuilder::new("Show Window").id("show").build(app)?;
                let quit_item = MenuItemBuilder::new("Quit").id("quit").build(app)?;
                let menu = MenuBuilder::new(app)
                    .item(&show_item)
                    .item(&quit_item)
                    .build()?;

                let _tray = TrayIconBuilder::with_id("main-tray")
                    .icon(tray_icon)
                    .menu(&menu)
                    .tooltip("Rustler")
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click { .. } = event {
                            if let Some(window) = tray.app_handle().get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .on_menu_event(|app, event| match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    // Hide to tray instead of exiting so hotkey recording continues
                    api.prevent_close();
                    let _ = window.hide();
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
            commands::hotkey::is_wayland_session,
            commands::hotkey::reset_wayland_hotkey,
            // Clipboard commands
            commands::clipboard::paste_text,
            // History commands
            commands::history::get_history,
            commands::history::add_history,
            commands::history::delete_history_entry,
            commands::history::clear_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
