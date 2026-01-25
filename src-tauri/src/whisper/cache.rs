#![allow(dead_code)]

use anyhow::Result;
use parking_lot::Mutex;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use whisper_rs::{WhisperContext, WhisperContextParameters};

/// Default timeout for unloading unused models (5 minutes)
const DEFAULT_UNLOAD_TIMEOUT: Duration = Duration::from_secs(5 * 60);

/// Cached Whisper model with usage tracking
struct CachedModel {
    /// The loaded Whisper context
    context: WhisperContext,
    /// Model identifier (name)
    model_id: String,
    /// Whether this model was loaded with GPU
    use_gpu: bool,
    /// Last time this model was used
    last_used: Instant,
}

/// Model cache that keeps models loaded and unloads them after inactivity
pub struct ModelCache {
    /// Currently cached model (only one at a time to save memory)
    cached: Mutex<Option<CachedModel>>,
    /// Timeout after which unused models are unloaded
    unload_timeout: Duration,
}

impl Default for ModelCache {
    fn default() -> Self {
        Self::new()
    }
}

impl ModelCache {
    /// Creates a new model cache with default timeout (5 minutes)
    pub fn new() -> Self {
        Self {
            cached: Mutex::new(None),
            unload_timeout: DEFAULT_UNLOAD_TIMEOUT,
        }
    }

    /// Gets or loads a model, returning a reference to use for transcription
    ///
    /// If the requested model is already cached with the same GPU setting, returns it immediately.
    /// If a different model or GPU setting is requested, unloads the current one first.
    /// Updates the last_used timestamp on access.
    pub fn get_or_load(
        &self,
        model_id: &str,
        model_path: PathBuf,
        use_gpu: bool,
    ) -> Result<ModelGuard<'_>> {
        let mut cached = self.cached.lock();

        // Check if we have the right model cached with the same GPU setting
        if let Some(ref mut model) = *cached {
            if model.model_id == model_id && model.use_gpu == use_gpu {
                // Update last used time
                model.last_used = Instant::now();
                log::info!("Using cached model: {} (GPU: {})", model_id, use_gpu);
                return Ok(ModelGuard {
                    cache: self,
                    _marker: std::marker::PhantomData,
                });
            } else {
                // Different model or GPU setting requested, unload current one
                log::info!(
                    "Unloading cached model '{}' (GPU: {}) to load '{}' (GPU: {})",
                    model.model_id,
                    model.use_gpu,
                    model_id,
                    use_gpu
                );
            }
        }

        // Load the new model with specified GPU setting
        log::info!(
            "Loading model '{}' from {:?} (GPU: {})",
            model_id,
            model_path,
            use_gpu
        );
        let mut params = WhisperContextParameters::default();
        params.use_gpu(use_gpu);

        let context = WhisperContext::new_with_params(
            model_path
                .to_str()
                .ok_or_else(|| anyhow::anyhow!("Invalid model path"))?,
            params,
        )?;

        *cached = Some(CachedModel {
            context,
            model_id: model_id.to_string(),
            use_gpu,
            last_used: Instant::now(),
        });

        log::info!("Model '{}' loaded and cached (GPU: {})", model_id, use_gpu);

        Ok(ModelGuard {
            cache: self,
            _marker: std::marker::PhantomData,
        })
    }

    /// Access the cached context for transcription
    ///
    /// # Safety
    /// Only call this while holding a ModelGuard
    pub fn with_context<F, R>(&self, f: F) -> Result<R>
    where
        F: FnOnce(&WhisperContext) -> Result<R>,
    {
        let cached = self.cached.lock();
        match &*cached {
            Some(model) => f(&model.context),
            None => Err(anyhow::anyhow!("No model loaded")),
        }
    }

    /// Checks if the cached model has been idle for longer than the timeout
    /// and unloads it if so. Returns true if a model was unloaded.
    pub fn cleanup_if_idle(&self) -> bool {
        let mut cached = self.cached.lock();

        if let Some(ref model) = *cached {
            if model.last_used.elapsed() > self.unload_timeout {
                log::info!(
                    "Unloading model '{}' after {} seconds of inactivity",
                    model.model_id,
                    model.last_used.elapsed().as_secs()
                );
                *cached = None;
                return true;
            }
        }

        false
    }

    /// Forces unloading of any cached model
    pub fn unload(&self) {
        let mut cached = self.cached.lock();
        if let Some(ref model) = *cached {
            log::info!("Force unloading model: {}", model.model_id);
        }
        *cached = None;
    }

    /// Returns info about the currently cached model, if any
    pub fn get_cached_info(&self) -> Option<(String, Duration)> {
        let cached = self.cached.lock();
        cached
            .as_ref()
            .map(|m| (m.model_id.clone(), m.last_used.elapsed()))
    }
}

/// Guard that ensures the model stays loaded while in use
pub struct ModelGuard<'a> {
    #[allow(dead_code)]
    cache: &'a ModelCache,
    _marker: std::marker::PhantomData<&'a ()>,
}

/// Global model cache instance
static MODEL_CACHE: std::sync::OnceLock<Arc<ModelCache>> = std::sync::OnceLock::new();

/// Gets the global model cache instance
pub fn get_model_cache() -> Arc<ModelCache> {
    MODEL_CACHE
        .get_or_init(|| Arc::new(ModelCache::new()))
        .clone()
}

/// Starts the background cleanup task that unloads idle models
pub fn start_cleanup_task() {
    std::thread::spawn(|| {
        let cache = get_model_cache();
        loop {
            // Check every 30 seconds
            std::thread::sleep(Duration::from_secs(30));
            cache.cleanup_if_idle();
        }
    });
}
