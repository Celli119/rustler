use anyhow::Result;
use std::path::PathBuf;
use whisper_rs::{WhisperContext as WRContext, WhisperContextParameters};

/// Wrapper around whisper-rs context for managing Whisper models
#[allow(dead_code)]
pub struct WhisperContext {
    /// The underlying whisper-rs context
    context: WRContext,
}

#[allow(dead_code)]
impl WhisperContext {
    /// Creates a new Whisper context from a model file
    ///
    /// # Arguments
    /// * `model_path` - Path to the Whisper model file (.bin)
    ///
    /// # Returns
    /// * `Ok(WhisperContext)` if the context was created successfully
    /// * `Err` if the model could not be loaded
    pub fn new(model_path: PathBuf) -> Result<Self> {
        log::info!("Loading Whisper model from: {:?}", model_path);

        let params = WhisperContextParameters::default();
        let context = WRContext::new_with_params(
            model_path
                .to_str()
                .ok_or_else(|| anyhow::anyhow!("Invalid model path"))?,
            params,
        )?;

        log::info!("Whisper model loaded successfully");

        Ok(Self { context })
    }

    /// Returns a reference to the underlying whisper-rs context
    pub fn get_context(&self) -> &WRContext {
        &self.context
    }

    /// Returns a mutable reference to the underlying whisper-rs context
    pub fn get_context_mut(&mut self) -> &mut WRContext {
        &mut self.context
    }
}
