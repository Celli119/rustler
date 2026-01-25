use crate::{audio::recorder::AudioRecorder, AppState};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

/// Starts audio recording
///
/// # Arguments
/// * `state` - Application state containing the audio recorder
///
/// # Returns
/// * `Ok(())` if recording started successfully
/// * `Err(String)` with error message if recording failed to start
#[tauri::command]
pub async fn start_recording(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    log::info!("Starting audio recording");

    let mut recording = state.recording.lock();

    // Check if already recording
    if recording.is_some() {
        return Err("Recording already in progress".to_string());
    }

    // Start recording and get handle
    let handle = AudioRecorder::start_recording()
        .map_err(|e| format!("Failed to start recording: {}", e))?;

    *recording = Some(handle);

    // Emit recording status to all windows
    let _ = app.emit(
        "recording-status",
        serde_json::json!({ "isRecording": true }),
    );

    log::info!("Audio recording started successfully");
    Ok(())
}

/// Stops audio recording and returns the path to the recorded audio file
///
/// # Arguments
/// * `state` - Application state containing the audio recorder
///
/// # Returns
/// * `Ok(String)` with the path to the recorded audio file
/// * `Err(String)` with error message if no recording is in progress or stopping failed
#[tauri::command]
pub async fn stop_recording(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<String, String> {
    log::info!("Stopping audio recording");

    let mut recording = state.recording.lock();

    // Check if recording is in progress
    let handle = recording
        .take()
        .ok_or_else(|| "No recording in progress".to_string())?;

    // Emit recording stopped status to all windows
    let _ = app.emit(
        "recording-status",
        serde_json::json!({ "isRecording": false }),
    );

    // Stop recording and get audio data
    let audio_data = handle
        .stop()
        .map_err(|e| format!("Failed to stop recording: {}", e))?;

    // Save audio data to temporary file
    let temp_dir = std::env::temp_dir();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let audio_path = temp_dir.join(format!("whispr_recording_{}.wav", timestamp));

    // Write WAV file
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = hound::WavWriter::create(&audio_path, spec)
        .map_err(|e| format!("Failed to create WAV file: {}", e))?;

    for sample in audio_data {
        let amplitude = (sample * i16::MAX as f32) as i16;
        writer
            .write_sample(amplitude)
            .map_err(|e| format!("Failed to write audio sample: {}", e))?;
    }

    writer
        .finalize()
        .map_err(|e| format!("Failed to finalize WAV file: {}", e))?;

    let path_str = audio_path.to_string_lossy().to_string();
    log::info!("Audio recording stopped and saved to: {}", path_str);

    Ok(path_str)
}
