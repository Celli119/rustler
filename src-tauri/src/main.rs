// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // On Linux with Wayland, force X11/XWayland backend for clipboard compatibility
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WAYLAND_DISPLAY").is_ok() {
            std::env::set_var("GDK_BACKEND", "x11");
        }
    }

    rustler_lib::run();
}
