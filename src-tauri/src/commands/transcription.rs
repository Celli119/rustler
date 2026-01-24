use crate::{AppState, whisper::transcriber::Transcriber};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

/// Transcribes audio file to text using the specified Whisper model
///
/// # Arguments
/// * `audio_path` - Path to the audio file to transcribe
/// * `model` - Name of the Whisper model to use (e.g., "base", "small")
/// * `state` - Application state
///
/// # Returns
/// * `Ok(String)` with the transcribed text
/// * `Err(String)` with error message if transcription failed
#[tauri::command]
pub async fn transcribe_audio(
    app: AppHandle,
    audio_path: String,
    model: String,
    _state: State<'_, Arc<AppState>>,
) -> Result<String, String> {
    log::info!("Transcribing audio file: {} with model: {}", audio_path, model);

    // Emit processing started
    let _ = app.emit("processing-status", serde_json::json!({ "isProcessing": true }));

    // Get model path
    let model_path = crate::models::downloader::ModelDownloader::new()
        .get_model_path(&model);

    // Check if model exists
    if !model_path.exists() {
        return Err(format!("Model '{}' not found. Please download it first.", model));
    }

    // Load audio file
    let mut reader = hound::WavReader::open(&audio_path)
        .map_err(|e| format!("Failed to open audio file: {}", e))?;

    // Convert audio to f32 samples
    let audio_data: Vec<f32> = reader
        .samples::<i16>()
        .map(|s| s.unwrap() as f32 / i16::MAX as f32)
        .collect();

    // Create transcriber
    let transcriber = Transcriber::new(model_path)
        .map_err(|e| format!("Failed to create transcriber: {}", e))?;

    // Transcribe audio
    let text = transcriber.transcribe(&audio_data)
        .map_err(|e| format!("Failed to transcribe audio: {}", e))?;

    log::info!("Transcription completed: {} characters", text.len());

    // Emit processing completed with transcription
    let _ = app.emit("processing-status", serde_json::json!({ "isProcessing": false }));
    let _ = app.emit("transcription-complete", serde_json::json!({ "text": text }));

    Ok(text)
}
