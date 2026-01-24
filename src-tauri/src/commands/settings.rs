use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Application settings structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    /// Global hotkey for triggering recording
    pub hotkey: String,
    /// Whisper model to use for transcription
    pub model: String,
    /// Whether to use GPU acceleration
    pub use_gpu: bool,
    /// Language code for transcription (e.g., "en", "es")
    pub language: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            hotkey: "CommandOrControl+Shift+Space".to_string(),
            model: "base".to_string(),
            use_gpu: false,
            language: "en".to_string(),
        }
    }
}

/// Gets the path to the settings file
fn get_settings_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Failed to get config directory".to_string())?;

    let app_config_dir = config_dir.join("rustler");

    // Create directory if it doesn't exist
    if !app_config_dir.exists() {
        std::fs::create_dir_all(&app_config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    Ok(app_config_dir.join("settings.json"))
}

/// Retrieves the current application settings
///
/// # Returns
/// * `Ok(Settings)` with the current settings
/// * `Err(String)` if settings could not be loaded
#[tauri::command]
pub async fn get_settings() -> Result<Settings, String> {
    log::info!("Loading settings");

    let settings_path = get_settings_path()?;

    // If settings file doesn't exist, return defaults
    if !settings_path.exists() {
        log::info!("Settings file not found, using defaults");
        return Ok(Settings::default());
    }

    // Read settings file
    let contents = std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings file: {}", e))?;

    // Parse JSON
    let settings: Settings = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;

    log::info!("Settings loaded successfully");
    Ok(settings)
}

/// Saves application settings to disk
///
/// # Arguments
/// * `settings` - Settings object to save
///
/// # Returns
/// * `Ok(())` if settings were saved successfully
/// * `Err(String)` if saving failed
#[tauri::command]
pub async fn save_settings(settings: Settings) -> Result<(), String> {
    log::info!("Saving settings");

    let settings_path = get_settings_path()?;

    // Serialize to JSON
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    // Write to file
    std::fs::write(&settings_path, json)
        .map_err(|e| format!("Failed to write settings file: {}", e))?;

    log::info!("Settings saved successfully");
    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    /// Helper to create a temporary test directory for settings
    fn create_test_config_dir() -> PathBuf {
        let test_dir = std::env::temp_dir().join(format!("rustler_settings_test_{}", std::process::id()));
        if test_dir.exists() {
            fs::remove_dir_all(&test_dir).ok();
        }
        fs::create_dir_all(&test_dir).unwrap();
        test_dir
    }

    /// Helper to clean up test directory
    fn cleanup_test_dir(path: &Path) {
        if path.exists() {
            fs::remove_dir_all(path).ok();
        }
    }

    #[test]
    fn test_settings_default_values() {
        let settings = Settings::default();

        assert_eq!(settings.hotkey, "CommandOrControl+Shift+Space");
        assert_eq!(settings.model, "base");
        assert!(!settings.use_gpu);
        assert_eq!(settings.language, "en");
    }

    #[test]
    fn test_settings_clone() {
        let settings = Settings {
            hotkey: "Ctrl+Alt+R".to_string(),
            model: "large".to_string(),
            use_gpu: true,
            language: "es".to_string(),
        };

        let cloned = settings.clone();

        assert_eq!(cloned.hotkey, settings.hotkey);
        assert_eq!(cloned.model, settings.model);
        assert_eq!(cloned.use_gpu, settings.use_gpu);
        assert_eq!(cloned.language, settings.language);
    }

    #[test]
    fn test_settings_debug() {
        let settings = Settings::default();
        let debug_str = format!("{:?}", settings);

        assert!(debug_str.contains("Settings"));
        assert!(debug_str.contains("hotkey"));
        assert!(debug_str.contains("model"));
    }

    #[test]
    fn test_settings_serialize_deserialize() {
        let settings = Settings {
            hotkey: "Ctrl+Shift+A".to_string(),
            model: "medium".to_string(),
            use_gpu: true,
            language: "fr".to_string(),
        };

        // Serialize to JSON
        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("Ctrl+Shift+A"));
        assert!(json.contains("medium"));
        assert!(json.contains("true"));
        assert!(json.contains("fr"));

        // Deserialize back
        let deserialized: Settings = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.hotkey, settings.hotkey);
        assert_eq!(deserialized.model, settings.model);
        assert_eq!(deserialized.use_gpu, settings.use_gpu);
        assert_eq!(deserialized.language, settings.language);
    }

    #[test]
    fn test_settings_deserialize_from_json_object() {
        let json = r#"{
            "hotkey": "Alt+S",
            "model": "tiny",
            "use_gpu": false,
            "language": "de"
        }"#;

        let settings: Settings = serde_json::from_str(json).unwrap();

        assert_eq!(settings.hotkey, "Alt+S");
        assert_eq!(settings.model, "tiny");
        assert!(!settings.use_gpu);
        assert_eq!(settings.language, "de");
    }

    #[test]
    fn test_settings_pretty_serialize() {
        let settings = Settings::default();

        // Test pretty print serialization
        let json = serde_json::to_string_pretty(&settings).unwrap();
        assert!(json.contains('\n')); // Pretty print includes newlines
    }

    #[test]
    fn test_get_settings_path_returns_result() {
        // This test verifies the function doesn't panic
        let result = get_settings_path();
        // On most systems, this should succeed
        // If it fails, that's acceptable in some test environments
        if let Ok(path) = result {
            assert!(path.ends_with("settings.json"));
            assert!(path.to_string_lossy().contains("rustler"));
        }
    }

    /// Test helper module for file-based settings operations
    mod file_ops {
        use super::*;

        /// Write settings to a specific path for testing
        pub fn write_settings_to_path(path: &Path, settings: &Settings) -> Result<(), String> {
            let json = serde_json::to_string_pretty(settings)
                .map_err(|e| format!("Failed to serialize: {}", e))?;
            fs::write(path, json)
                .map_err(|e| format!("Failed to write: {}", e))?;
            Ok(())
        }

        /// Read settings from a specific path for testing
        pub fn read_settings_from_path(path: &Path) -> Result<Settings, String> {
            let contents = fs::read_to_string(path)
                .map_err(|e| format!("Failed to read: {}", e))?;
            serde_json::from_str(&contents)
                .map_err(|e| format!("Failed to parse: {}", e))
        }
    }

    #[test]
    fn test_settings_file_roundtrip() {
        let test_dir = create_test_config_dir();
        let settings_path = test_dir.join("settings.json");

        let original = Settings {
            hotkey: "Ctrl+R".to_string(),
            model: "small".to_string(),
            use_gpu: true,
            language: "ja".to_string(),
        };

        // Write settings
        file_ops::write_settings_to_path(&settings_path, &original).unwrap();

        // Read settings back
        let loaded = file_ops::read_settings_from_path(&settings_path).unwrap();

        assert_eq!(loaded.hotkey, original.hotkey);
        assert_eq!(loaded.model, original.model);
        assert_eq!(loaded.use_gpu, original.use_gpu);
        assert_eq!(loaded.language, original.language);

        cleanup_test_dir(&test_dir);
    }

    #[test]
    fn test_settings_invalid_json_fails() {
        let invalid_json = "{ not valid json }";
        let result: Result<Settings, _> = serde_json::from_str(invalid_json);
        assert!(result.is_err());
    }

    #[test]
    fn test_settings_missing_field_fails() {
        let incomplete_json = r#"{ "hotkey": "Ctrl+A" }"#;
        let result: Result<Settings, _> = serde_json::from_str(incomplete_json);
        assert!(result.is_err());
    }
}
