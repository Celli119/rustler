use crate::{AppState, whisper::cache::get_model_cache};
use crate::commands::settings::get_settings;
use std::sync::Arc;
use std::path::PathBuf;
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
    // Get settings to check GPU preference
    let settings = get_settings().await.map_err(|e| format!("Failed to get settings: {}", e))?;
    let use_gpu = settings.use_gpu;

    log::info!("Transcribing audio file: {} with model: {} (GPU: {})", audio_path, model, use_gpu);

    // Emit processing started
    let _ = app.emit("processing-status", serde_json::json!({ "isProcessing": true }));

    // Get model path
    let model_path = crate::models::downloader::ModelDownloader::new()
        .get_model_path(&model);

    // Check if model exists
    if !model_path.exists() {
        log::error!("Model file not found at {:?}", model_path);
        let _ = app.emit("processing-status", serde_json::json!({ "isProcessing": false }));
        return Err(format!("Model '{}' not found. Please download it first.", model));
    }

    // Clone values for the blocking task
    let audio_path_clone = audio_path.clone();
    let model_clone = model.clone();
    let app_clone = app.clone();

    // Run the CPU-intensive transcription in a separate thread using oneshot channel
    let (tx, rx) = tokio::sync::oneshot::channel();

    std::thread::spawn(move || {
        let result = transcribe_blocking(audio_path_clone, model_clone, model_path, use_gpu);
        let _ = tx.send(result);
    });

    let text = rx.await
        .map_err(|e| {
            let _ = app_clone.emit("processing-status", serde_json::json!({ "isProcessing": false }));
            format!("Channel receive error: {}", e)
        })?
        .map_err(|e| {
            let _ = app.emit("processing-status", serde_json::json!({ "isProcessing": false }));
            e
        })?;

    log::info!("Transcription completed: {} characters", text.len());

    // Emit processing completed with transcription
    let _ = app.emit("processing-status", serde_json::json!({ "isProcessing": false }));
    let _ = app.emit("transcription-complete", serde_json::json!({ "text": text }));

    Ok(text)
}

/// Blocking transcription function to be run in a separate thread
fn transcribe_blocking(
    audio_path: String,
    model: String,
    model_path: PathBuf,
    use_gpu: bool,
) -> Result<String, String> {
    // Load audio file
    let mut reader = hound::WavReader::open(&audio_path)
        .map_err(|e| format!("Failed to open audio file: {}", e))?;

    // Convert audio to f32 samples
    let audio_data: Vec<f32> = reader
        .samples::<i16>()
        .map(|s| s.unwrap() as f32 / i16::MAX as f32)
        .collect();

    // Get or load model from cache (stays loaded for 5 minutes after last use)
    // Pass the use_gpu setting - if it changes, the model will be reloaded
    let cache = get_model_cache();
    let _guard = cache.get_or_load(&model, model_path, use_gpu)
        .map_err(|e| format!("Failed to load model: {}", e))?;

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
    }).map_err(|e: anyhow::Error| format!("Failed to transcribe audio: {}", e))?;

    Ok(text)
}
