use crate::{AppState, whisper::cache::get_model_cache};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use whisper_rs::{FullParams, SamplingStrategy};

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
        let _ = app.emit("processing-status", serde_json::json!({ "isProcessing": false }));
        return Err(format!("Model '{}' not found. Please download it first.", model));
    }

    // Load audio file
    let mut reader = hound::WavReader::open(&audio_path)
        .map_err(|e| {
            let _ = app.emit("processing-status", serde_json::json!({ "isProcessing": false }));
            format!("Failed to open audio file: {}", e)
        })?;

    // Convert audio to f32 samples
    let audio_data: Vec<f32> = reader
        .samples::<i16>()
        .map(|s| s.unwrap() as f32 / i16::MAX as f32)
        .collect();

    // Get or load model from cache (stays loaded for 5 minutes after last use)
    let cache = get_model_cache();
    let _guard = cache.get_or_load(&model, model_path)
        .map_err(|e| {
            let _ = app.emit("processing-status", serde_json::json!({ "isProcessing": false }));
            format!("Failed to load model: {}", e)
        })?;

    // Transcribe using cached model
    let text = cache.with_context(|context| {
        log::info!("Transcribing {} audio samples", audio_data.len());

        // Create transcription parameters
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_n_threads(4);
        params.set_translate(false);
        params.set_language(Some("en"));
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);

        // Create state and run transcription
        let mut state = context.create_state()?;
        state.full(params, &audio_data)?;

        // Extract transcribed text
        let num_segments = state.full_n_segments();
        let mut result = String::new();

        for i in 0..num_segments {
            if let Some(segment) = state.get_segment(i) {
                if let Ok(text) = segment.to_str() {
                    result.push_str(text);
                    if i < num_segments - 1 {
                        result.push(' ');
                    }
                }
            }
        }

        Ok(result.trim().to_string())
    }).map_err(|e: anyhow::Error| {
        let _ = app.emit("processing-status", serde_json::json!({ "isProcessing": false }));
        format!("Failed to transcribe audio: {}", e)
    })?;

    log::info!("Transcription completed: {} characters", text.len());

    // Emit processing completed with transcription
    let _ = app.emit("processing-status", serde_json::json!({ "isProcessing": false }));
    let _ = app.emit("transcription-complete", serde_json::json!({ "text": text }));

    Ok(text)
}
