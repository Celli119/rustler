use anyhow::{Result, Context};
use futures_util::StreamExt;
use std::collections::HashMap;
use std::path::PathBuf;

/// HuggingFace URLs for Whisper models
const WHISPER_MODELS: &[(&str, &str)] = &[
    ("tiny", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin"),
    ("base", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"),
    ("small", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"),
    ("medium", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin"),
    ("large", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin"),
    ("turbo", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin"),
];

/// Manages downloading and storing Whisper models
pub struct ModelDownloader {
    /// Model URLs by ID
    model_urls: HashMap<String, String>,
    /// Directory where models are stored
    models_dir: PathBuf,
}

impl ModelDownloader {
    /// Creates a new model downloader
    pub fn new() -> Self {
        let models_dir = Self::get_default_models_dir();

        // Create models directory if it doesn't exist
        if !models_dir.exists() {
            std::fs::create_dir_all(&models_dir).ok();
        }

        let model_urls: HashMap<String, String> = WHISPER_MODELS
            .iter()
            .map(|(id, url)| (id.to_string(), url.to_string()))
            .collect();

        Self {
            model_urls,
            models_dir,
        }
    }

    /// Gets the default directory for storing models
    fn get_default_models_dir() -> PathBuf {
        dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("rustler")
            .join("models")
    }

    /// Downloads a model with progress callback
    ///
    /// # Arguments
    /// * `model_id` - ID of the model to download
    /// * `progress_callback` - Function called with download progress (0.0 to 1.0)
    ///
    /// # Returns
    /// * `Ok(PathBuf)` with the path to the downloaded model
    /// * `Err` if download failed
    pub async fn download<F>(&self, model_id: &str, mut progress_callback: F) -> Result<PathBuf>
    where
        F: FnMut(f64),
    {
        log::info!("Starting download for model: {}", model_id);

        let url = self.model_urls.get(model_id)
            .context("Unknown model ID")?;

        let model_path = self.get_model_path(model_id);

        // If model already exists, return its path
        if model_path.exists() {
            log::info!("Model already downloaded: {:?}", model_path);
            return Ok(model_path);
        }

        // Create HTTP client
        let client = reqwest::Client::new();
        let response = client.get(url).send().await?;

        // Get total size
        let total_size = response.content_length().unwrap_or(0);

        // Download with progress tracking
        let mut downloaded: u64 = 0;
        let mut stream = response.bytes_stream();
        let mut file_bytes = Vec::new();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            file_bytes.extend_from_slice(&chunk);
            downloaded += chunk.len() as u64;

            if total_size > 0 {
                let progress = downloaded as f64 / total_size as f64;
                progress_callback(progress);
            }
        }

        // Write to file
        std::fs::write(&model_path, file_bytes)
            .context("Failed to write model file")?;

        log::info!("Model downloaded successfully: {:?}", model_path);

        Ok(model_path)
    }

    /// Gets the path where a model would be stored
    ///
    /// # Arguments
    /// * `model_id` - ID of the model
    ///
    /// # Returns
    /// The path where the model file is or would be stored
    pub fn get_model_path(&self, model_id: &str) -> PathBuf {
        self.models_dir.join(format!("ggml-{}.bin", model_id))
    }

    /// Checks if a model is already downloaded
    ///
    /// # Arguments
    /// * `model_id` - ID of the model to check
    ///
    /// # Returns
    /// `true` if the model file exists, `false` otherwise
    pub fn is_downloaded(&self, model_id: &str) -> bool {
        self.get_model_path(model_id).exists()
    }

    /// Gets the models directory path
    ///
    /// # Returns
    /// The path to the directory where models are stored
    pub fn get_models_dir(&self) -> PathBuf {
        self.models_dir.clone()
    }
}

impl Default for ModelDownloader {
    fn default() -> Self {
        Self::new()
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    /// Helper to create a temporary test directory
    fn create_test_dir() -> PathBuf {
        let test_dir = std::env::temp_dir().join(format!("rustler_test_{}", std::process::id()));
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

    /// Test helper to create a downloader with a custom models directory
    fn create_test_downloader(models_dir: PathBuf) -> ModelDownloader {
        let model_urls: HashMap<String, String> = WHISPER_MODELS
            .iter()
            .map(|(id, url)| (id.to_string(), url.to_string()))
            .collect();

        ModelDownloader {
            model_urls,
            models_dir,
        }
    }

    #[test]
    fn test_new_creates_downloader_with_all_models() {
        let downloader = ModelDownloader::new();

        // Check all expected models are available
        let expected_models = ["tiny", "base", "small", "medium", "large", "turbo"];
        for model in expected_models {
            assert!(
                downloader.model_urls.contains_key(model),
                "Model {} should be available",
                model
            );
        }
    }

    #[test]
    fn test_default_impl() {
        let downloader = ModelDownloader::default();
        assert!(!downloader.model_urls.is_empty());
    }

    #[test]
    fn test_get_model_path_returns_correct_path() {
        let test_dir = create_test_dir();
        let downloader = create_test_downloader(test_dir.clone());

        let path = downloader.get_model_path("tiny");
        assert_eq!(path, test_dir.join("ggml-tiny.bin"));

        let path = downloader.get_model_path("large");
        assert_eq!(path, test_dir.join("ggml-large.bin"));

        cleanup_test_dir(&test_dir);
    }

    #[test]
    fn test_get_models_dir_returns_configured_directory() {
        let test_dir = create_test_dir();
        let downloader = create_test_downloader(test_dir.clone());

        assert_eq!(downloader.get_models_dir(), test_dir);

        cleanup_test_dir(&test_dir);
    }

    #[test]
    fn test_is_downloaded_returns_false_for_missing_model() {
        let test_dir = create_test_dir();
        let downloader = create_test_downloader(test_dir.clone());

        assert!(!downloader.is_downloaded("tiny"));
        assert!(!downloader.is_downloaded("base"));

        cleanup_test_dir(&test_dir);
    }

    #[test]
    fn test_is_downloaded_returns_true_for_existing_model() {
        let test_dir = create_test_dir();
        let downloader = create_test_downloader(test_dir.clone());

        // Create a fake model file, ensuring parent directory exists
        let model_path = downloader.get_model_path("tiny");
        if let Some(parent) = model_path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(&model_path, b"fake model data").unwrap();

        assert!(downloader.is_downloaded("tiny"));
        assert!(!downloader.is_downloaded("base"));

        cleanup_test_dir(&test_dir);
    }

    #[test]
    fn test_get_default_models_dir_returns_valid_path() {
        let models_dir = ModelDownloader::get_default_models_dir();

        // The path should end with "rustler/models"
        assert!(models_dir.ends_with("rustler/models") || models_dir.ends_with("rustler\\models"));
    }

    #[tokio::test]
    async fn test_download_returns_existing_path_if_model_exists() {
        let test_dir = create_test_dir();
        let downloader = create_test_downloader(test_dir.clone());

        // Create a fake model file, ensuring parent directory exists
        let model_path = downloader.get_model_path("tiny");
        if let Some(parent) = model_path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        let expected_content = b"existing model data";
        fs::write(&model_path, expected_content).unwrap();

        // Download should return the existing path without downloading
        let mut progress_called = false;
        let result = downloader
            .download("tiny", |_| {
                progress_called = true;
            })
            .await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), model_path);
        // Progress callback should not be called for existing files
        assert!(!progress_called);

        // Verify the file content was not modified
        let content = fs::read(&model_path).unwrap();
        assert_eq!(content, expected_content);

        cleanup_test_dir(&test_dir);
    }

    #[tokio::test]
    async fn test_download_fails_for_unknown_model() {
        let test_dir = create_test_dir();
        let downloader = create_test_downloader(test_dir.clone());

        let result = downloader.download("nonexistent_model", |_| {}).await;

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.to_string().contains("Unknown model ID"));

        cleanup_test_dir(&test_dir);
    }
}
