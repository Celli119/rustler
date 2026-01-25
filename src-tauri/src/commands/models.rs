use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{Emitter, Window};

/// Represents a Whisper model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhisperModel {
    /// Unique identifier for the model
    pub id: String,
    /// Display name of the model
    pub name: String,
    /// Size of the model file in MB
    pub size: u64,
    /// Whether the model is downloaded locally
    pub downloaded: bool,
}

/// Returns a list of available Whisper models
///
/// # Returns
/// * `Ok(Vec<WhisperModel>)` with all available models
/// * `Err(String)` if the models directory could not be accessed
#[tauri::command]
pub async fn get_available_models() -> Result<Vec<WhisperModel>, String> {
    log::info!("Getting available models");

    let downloader = crate::models::downloader::ModelDownloader::new();

    let models = vec![
        WhisperModel {
            id: "tiny".to_string(),
            name: "Tiny (75 MB)".to_string(),
            size: 75,
            downloaded: downloader.is_downloaded("tiny"),
        },
        WhisperModel {
            id: "base".to_string(),
            name: "Base (142 MB)".to_string(),
            size: 142,
            downloaded: downloader.is_downloaded("base"),
        },
        WhisperModel {
            id: "small".to_string(),
            name: "Small (466 MB)".to_string(),
            size: 466,
            downloaded: downloader.is_downloaded("small"),
        },
        WhisperModel {
            id: "medium".to_string(),
            name: "Medium (1.5 GB)".to_string(),
            size: 1500,
            downloaded: downloader.is_downloaded("medium"),
        },
        WhisperModel {
            id: "large".to_string(),
            name: "Large (2.9 GB)".to_string(),
            size: 2900,
            downloaded: downloader.is_downloaded("large"),
        },
        WhisperModel {
            id: "turbo".to_string(),
            name: "Turbo (809 MB)".to_string(),
            size: 809,
            downloaded: downloader.is_downloaded("turbo"),
        },
    ];

    Ok(models)
}

/// Download progress payload
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgressPayload {
    model_id: String,
    percentage: f64,
}

/// Downloads a Whisper model from HuggingFace
///
/// # Arguments
/// * `model_id` - ID of the model to download (e.g., "base", "small")
/// * `window` - Tauri window handle for emitting progress events
///
/// # Returns
/// * `Ok(())` if download was successful
/// * `Err(String)` if download failed
#[tauri::command]
pub async fn download_model(model_id: String, window: Window) -> Result<(), String> {
    log::info!("Downloading model: {}", model_id);

    let downloader = crate::models::downloader::ModelDownloader::new();
    let model_id_clone = model_id.clone();
    let mut last_reported: i32 = -1;

    // Download with progress callback (throttled to only emit on whole percentage changes)
    downloader
        .download(&model_id, |progress| {
            let percentage = (progress * 100.0) as i32;
            if percentage > last_reported {
                last_reported = percentage;
                let payload = DownloadProgressPayload {
                    model_id: model_id_clone.clone(),
                    percentage: percentage as f64,
                };
                let _ = window.emit("download-progress", payload);
            }
        })
        .await
        .map_err(|e| e.to_string())?;

    log::info!("Model downloaded successfully: {}", model_id);
    Ok(())
}

/// Deletes a downloaded Whisper model
///
/// # Arguments
/// * `model_id` - ID of the model to delete
///
/// # Returns
/// * `Ok(())` if deletion was successful
/// * `Err(String)` if deletion failed
#[tauri::command]
pub async fn delete_model(model_id: String) -> Result<(), String> {
    log::info!("Deleting model: {}", model_id);

    let downloader = crate::models::downloader::ModelDownloader::new();
    let model_path = downloader.get_model_path(&model_id);

    if !model_path.exists() {
        return Err(format!("Model '{}' is not downloaded", model_id));
    }

    std::fs::remove_file(&model_path).map_err(|e| format!("Failed to delete model: {}", e))?;

    log::info!("Model deleted successfully: {}", model_id);
    Ok(())
}

/// Returns the path to the models directory
///
/// # Returns
/// The absolute path to the directory where models are stored
#[tauri::command]
pub async fn get_models_dir() -> PathBuf {
    crate::models::downloader::ModelDownloader::new().get_models_dir()
}
