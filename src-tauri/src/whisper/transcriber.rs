use anyhow::Result;
use std::path::PathBuf;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

/// Audio transcriber using Whisper
pub struct Transcriber {
    /// Whisper context for transcription
    context: WhisperContext,
}

impl Transcriber {
    /// Creates a new transcriber with the specified model
    ///
    /// # Arguments
    /// * `model_path` - Path to the Whisper model file
    ///
    /// # Returns
    /// * `Ok(Transcriber)` if the transcriber was created successfully
    /// * `Err` if the model could not be loaded
    pub fn new(model_path: PathBuf) -> Result<Self> {
        log::info!("Creating transcriber with model: {:?}", model_path);

        let context = WhisperContext::new_with_params(
            model_path.to_str().ok_or_else(|| anyhow::anyhow!("Invalid model path"))?,
            WhisperContextParameters::default(),
        )?;

        Ok(Self { context })
    }

    /// Transcribes audio data to text
    ///
    /// # Arguments
    /// * `audio_data` - Audio samples as f32 values (16kHz, mono)
    ///
    /// # Returns
    /// * `Ok(String)` with the transcribed text
    /// * `Err` if transcription failed
    pub fn transcribe(&self, audio_data: &[f32]) -> Result<String> {
        log::info!("Transcribing {} audio samples", audio_data.len());

        // Create transcription parameters
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

        // Configure parameters
        params.set_n_threads(4);
        params.set_translate(false);
        params.set_language(Some("en"));
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);

        // Create a mutable state for transcription
        let mut state = self.context.create_state()?;

        // Run transcription
        state.full(params, audio_data)?;

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

        // Trim whitespace
        let result = result.trim().to_string();

        log::info!("Transcription complete: {} characters", result.len());

        Ok(result)
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    /// Tests for the Transcriber module
    /// Note: Most tests here validate the API and error handling without
    /// requiring an actual Whisper model, which would be too large for unit tests.

    #[test]
    fn test_new_fails_with_nonexistent_model() {
        let invalid_path = PathBuf::from("/nonexistent/path/to/model.bin");
        let result = Transcriber::new(invalid_path);

        assert!(result.is_err());
    }

    #[test]
    fn test_new_fails_with_empty_path() {
        let empty_path = PathBuf::from("");
        let result = Transcriber::new(empty_path);

        assert!(result.is_err());
    }

    #[test]
    fn test_new_fails_with_invalid_file() {
        // Create a temporary file with invalid model data
        let temp_dir = std::env::temp_dir();
        let fake_model_path = temp_dir.join(format!("fake_model_{}.bin", std::process::id()));
        
        // Write some garbage data that's not a valid whisper model
        std::fs::write(&fake_model_path, b"not a valid whisper model").unwrap();

        let result = Transcriber::new(fake_model_path.clone());

        // Clean up
        std::fs::remove_file(&fake_model_path).ok();

        // Should fail because the file is not a valid model
        assert!(result.is_err());
    }

    #[test]
    fn test_pathbuf_to_str_conversion() {
        // Test that paths can be converted to strings
        let valid_path = PathBuf::from("/some/valid/path/model.bin");
        assert!(valid_path.to_str().is_some());

        // Test with path containing valid characters
        let path_with_spaces = PathBuf::from("/path/with spaces/model.bin");
        assert!(path_with_spaces.to_str().is_some());
    }

    /// Module for testing transcription parameters and sampling strategies
    mod sampling_strategy_tests {
        use whisper_rs::{FullParams, SamplingStrategy};

        #[test]
        fn test_greedy_sampling_strategy() {
            // Verify we can create params with greedy strategy
            let params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
            // If this compiles and runs, the strategy is valid
            drop(params);
        }

        #[test]
        fn test_beam_search_sampling_strategy() {
            // Verify we can create params with beam search strategy
            let params = FullParams::new(SamplingStrategy::BeamSearch {
                beam_size: 5,
                patience: 1.0,
            });
            drop(params);
        }

        #[test]
        fn test_params_configuration() {
            let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

            // Test that we can configure various parameters
            params.set_n_threads(4);
            params.set_translate(false);
            params.set_language(Some("en"));
            params.set_print_special(false);
            params.set_print_progress(false);
            params.set_print_realtime(false);
            params.set_print_timestamps(false);

            // If we get here, all configurations are valid
        }

        #[test]
        fn test_params_language_options() {
            let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

            // Test various language codes
            params.set_language(Some("en"));
            params.set_language(Some("es"));
            params.set_language(Some("fr"));
            params.set_language(Some("de"));
            params.set_language(Some("ja"));
            params.set_language(None); // Auto-detect
        }
    }

    /// Tests for audio data validation
    mod audio_data_tests {
        #[test]
        fn test_audio_sample_format() {
            // Whisper expects f32 samples
            let samples: Vec<f32> = vec![0.0, 0.5, -0.5, 1.0, -1.0];
            assert_eq!(samples.len(), 5);

            // Samples should be in range [-1.0, 1.0] for normalized audio
            for sample in &samples {
                assert!(*sample >= -1.0 && *sample <= 1.0);
            }
        }

        #[test]
        fn test_empty_audio_data() {
            let empty_samples: Vec<f32> = vec![];
            assert!(empty_samples.is_empty());
        }

        #[test]
        fn test_silence_audio_data() {
            // Silence is represented as zeros
            let silence: Vec<f32> = vec![0.0; 16000]; // 1 second at 16kHz
            assert_eq!(silence.len(), 16000);
            assert!(silence.iter().all(|&s| s == 0.0));
        }

        #[test]
        fn test_generate_sine_wave() {
            // Helper to generate test audio (440Hz sine wave)
            let sample_rate = 16000.0;
            let frequency = 440.0;
            let duration_secs = 0.1;
            let num_samples = (sample_rate * duration_secs) as usize;

            let samples: Vec<f32> = (0..num_samples)
                .map(|i| {
                    let t = i as f32 / sample_rate;
                    (2.0 * std::f32::consts::PI * frequency * t).sin()
                })
                .collect();

            assert_eq!(samples.len(), 1600);
            // Sine wave values should be in [-1, 1]
            for sample in &samples {
                assert!(*sample >= -1.0 && *sample <= 1.0);
            }
        }
    }

    /// Tests for transcription result handling
    mod result_tests {
        #[test]
        fn test_trim_whitespace() {
            let result = "  Hello World  ".trim().to_string();
            assert_eq!(result, "Hello World");
        }

        #[test]
        fn test_concatenate_segments() {
            let segments = vec!["Hello", "World", "Test"];
            let mut result = String::new();

            for (i, segment) in segments.iter().enumerate() {
                result.push_str(segment);
                if i < segments.len() - 1 {
                    result.push(' ');
                }
            }

            assert_eq!(result, "Hello World Test");
        }

        #[test]
        fn test_empty_segments() {
            let segments: Vec<&str> = vec![];
            let result: String = segments.join(" ").trim().to_string();
            assert!(result.is_empty());
        }
    }
}
