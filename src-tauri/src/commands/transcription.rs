use crate::commands::settings::get_settings;
use crate::{whisper::cache::get_model_cache, AppState};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use whisper_rs::{FullParams, SamplingStrategy};

/// Minimum RMS threshold for audio to be considered non-silent.
/// Audio below this threshold will be skipped without transcription.
/// 0.001 is a conservative threshold that catches near-silence while allowing quiet speech.
const SILENCE_RMS_THRESHOLD: f32 = 0.001;

/// Minimum duration in samples for audio to be worth transcribing.
/// At 16kHz, this is 0.25 seconds (4000 samples).
const MIN_AUDIO_SAMPLES: usize = 4000;

/// Calculates the Root Mean Square (RMS) of audio samples.
/// RMS is a good measure of the overall energy/loudness of the audio signal.
fn calculate_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum_of_squares: f32 = samples.iter().map(|&s| s * s).sum();
    (sum_of_squares / samples.len() as f32).sqrt()
}

/// Checks if audio samples are effectively silent or too short to transcribe.
/// Returns true if the audio should be skipped.
fn is_audio_silent_or_too_short(samples: &[f32]) -> bool {
    // Check if audio is too short
    if samples.len() < MIN_AUDIO_SAMPLES {
        log::info!(
            "Audio too short ({} samples, minimum {}), skipping transcription",
            samples.len(),
            MIN_AUDIO_SAMPLES
        );
        return true;
    }

    // Check RMS level
    let rms = calculate_rms(samples);
    if rms < SILENCE_RMS_THRESHOLD {
        log::info!(
            "Audio is silent (RMS: {:.6}, threshold: {}), skipping transcription",
            rms,
            SILENCE_RMS_THRESHOLD
        );
        return true;
    }

    log::debug!("Audio RMS: {:.6}, proceeding with transcription", rms);
    false
}

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
    let settings = get_settings()
        .await
        .map_err(|e| format!("Failed to get settings: {}", e))?;
    let use_gpu = settings.use_gpu;

    log::info!(
        "Transcribing audio file: {} with model: {} (GPU: {})",
        audio_path,
        model,
        use_gpu
    );

    // Emit processing started
    let _ = app.emit(
        "processing-status",
        serde_json::json!({ "isProcessing": true }),
    );

    // Get model path
    let model_path = crate::models::downloader::ModelDownloader::new().get_model_path(&model);

    // Check if model exists
    if !model_path.exists() {
        log::error!("Model file not found at {:?}", model_path);
        let _ = app.emit(
            "processing-status",
            serde_json::json!({ "isProcessing": false }),
        );
        return Err(format!(
            "Model '{}' not found. Please download it first.",
            model
        ));
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

    let text = rx
        .await
        .map_err(|e| {
            let _ = app_clone.emit(
                "processing-status",
                serde_json::json!({ "isProcessing": false }),
            );
            format!("Channel receive error: {}", e)
        })?
        .map_err(|e| {
            let _ = app.emit(
                "processing-status",
                serde_json::json!({ "isProcessing": false }),
            );
            e
        })?;

    log::info!("Transcription completed: {} characters", text.len());

    // Emit processing completed with transcription
    let _ = app.emit(
        "processing-status",
        serde_json::json!({ "isProcessing": false }),
    );
    let _ = app.emit(
        "transcription-complete",
        serde_json::json!({ "text": text }),
    );

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

    // Check if audio is silent or too short - skip expensive transcription
    if is_audio_silent_or_too_short(&audio_data) {
        return Ok(String::new());
    }

    // Get or load model from cache (stays loaded for 5 minutes after last use)
    // Pass the use_gpu setting - if it changes, the model will be reloaded
    let cache = get_model_cache();
    let _guard = cache
        .get_or_load(&model, model_path, use_gpu)
        .map_err(|e| format!("Failed to load model: {}", e))?;

    // Transcribe using cached model
    let text = cache
        .with_context(|context| {
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
        })
        .map_err(|e: anyhow::Error| format!("Failed to transcribe audio: {}", e))?;

    Ok(text)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Tests for RMS calculation
    mod rms_tests {
        use super::*;

        #[test]
        fn test_calculate_rms_empty() {
            let samples: Vec<f32> = vec![];
            assert_eq!(calculate_rms(&samples), 0.0);
        }

        #[test]
        fn test_calculate_rms_silence() {
            let samples: Vec<f32> = vec![0.0; 1000];
            assert_eq!(calculate_rms(&samples), 0.0);
        }

        #[test]
        fn test_calculate_rms_constant_signal() {
            // RMS of constant signal equals the absolute value
            let samples: Vec<f32> = vec![0.5; 1000];
            let rms = calculate_rms(&samples);
            assert!((rms - 0.5).abs() < 0.0001);
        }

        #[test]
        fn test_calculate_rms_sine_wave() {
            // RMS of sine wave is amplitude / sqrt(2)
            let sample_rate = 16000.0;
            let frequency = 440.0;
            let amplitude = 0.5;
            let duration_secs = 1.0;
            let num_samples = (sample_rate * duration_secs) as usize;

            let samples: Vec<f32> = (0..num_samples)
                .map(|i| {
                    let t = i as f32 / sample_rate;
                    amplitude * (2.0 * std::f32::consts::PI * frequency * t).sin()
                })
                .collect();

            let rms = calculate_rms(&samples);
            let expected_rms = amplitude / std::f32::consts::SQRT_2;
            assert!((rms - expected_rms).abs() < 0.01);
        }

        #[test]
        fn test_calculate_rms_loud_signal() {
            // Full amplitude signal should have high RMS
            let samples: Vec<f32> = vec![1.0, -1.0, 1.0, -1.0];
            let rms = calculate_rms(&samples);
            assert!((rms - 1.0).abs() < 0.0001);
        }
    }

    /// Tests for silence detection
    mod silence_detection_tests {
        use super::*;

        #[test]
        fn test_empty_audio_is_silent() {
            let samples: Vec<f32> = vec![];
            assert!(is_audio_silent_or_too_short(&samples));
        }

        #[test]
        fn test_short_audio_is_silent() {
            // Less than MIN_AUDIO_SAMPLES
            let samples: Vec<f32> = vec![0.5; MIN_AUDIO_SAMPLES - 1];
            assert!(is_audio_silent_or_too_short(&samples));
        }

        #[test]
        fn test_silent_audio_detected() {
            // Enough samples but all zeros
            let samples: Vec<f32> = vec![0.0; MIN_AUDIO_SAMPLES + 1000];
            assert!(is_audio_silent_or_too_short(&samples));
        }

        #[test]
        fn test_very_quiet_audio_detected() {
            // Samples below threshold
            let samples: Vec<f32> = vec![0.0001; MIN_AUDIO_SAMPLES + 1000];
            assert!(is_audio_silent_or_too_short(&samples));
        }

        #[test]
        fn test_normal_audio_not_silent() {
            // Normal speech-like amplitude
            let samples: Vec<f32> = vec![0.1; MIN_AUDIO_SAMPLES + 1000];
            assert!(!is_audio_silent_or_too_short(&samples));
        }

        #[test]
        fn test_loud_audio_not_silent() {
            // Loud signal
            let samples: Vec<f32> = vec![0.5; MIN_AUDIO_SAMPLES + 1000];
            assert!(!is_audio_silent_or_too_short(&samples));
        }

        #[test]
        fn test_threshold_boundary() {
            // Just below threshold
            let below_threshold: Vec<f32> =
                vec![SILENCE_RMS_THRESHOLD * 0.5; MIN_AUDIO_SAMPLES + 100];
            assert!(is_audio_silent_or_too_short(&below_threshold));

            // Just above threshold
            let above_threshold: Vec<f32> =
                vec![SILENCE_RMS_THRESHOLD * 2.0; MIN_AUDIO_SAMPLES + 100];
            assert!(!is_audio_silent_or_too_short(&above_threshold));
        }

        #[test]
        fn test_exact_minimum_samples() {
            // Exactly MIN_AUDIO_SAMPLES passes the length check (we use < not <=)
            let samples: Vec<f32> = vec![0.5; MIN_AUDIO_SAMPLES];
            assert!(!is_audio_silent_or_too_short(&samples));

            // One less than minimum should fail length check
            let samples_minus_one: Vec<f32> = vec![0.5; MIN_AUDIO_SAMPLES - 1];
            assert!(is_audio_silent_or_too_short(&samples_minus_one));
        }

        #[test]
        fn test_realistic_sine_wave() {
            // Generate a realistic audio signal (440Hz tone)
            let sample_rate = 16000.0;
            let frequency = 440.0;
            let amplitude = 0.3; // Moderate amplitude
            let duration_secs = 0.5;
            let num_samples = (sample_rate * duration_secs) as usize;

            let samples: Vec<f32> = (0..num_samples)
                .map(|i| {
                    let t = i as f32 / sample_rate;
                    amplitude * (2.0 * std::f32::consts::PI * frequency * t).sin()
                })
                .collect();

            assert!(!is_audio_silent_or_too_short(&samples));
        }
    }
}
