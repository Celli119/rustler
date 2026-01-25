use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// A single transcription record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionRecord {
    pub id: String,
    pub text: String,
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

/// History storage structure
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct HistoryStorage {
    records: Vec<TranscriptionRecord>,
}

/// Get the path to the history file
fn get_history_path() -> PathBuf {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("rustler");

    // Ensure directory exists
    let _ = fs::create_dir_all(&config_dir);

    config_dir.join("history.json")
}

/// Load history from file
fn load_history() -> HistoryStorage {
    let path = get_history_path();

    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => HistoryStorage::default(),
        }
    } else {
        HistoryStorage::default()
    }
}

/// Save history to file
fn save_history(storage: &HistoryStorage) -> Result<(), String> {
    let path = get_history_path();
    let content = serde_json::to_string_pretty(storage)
        .map_err(|e| format!("Failed to serialize history: {}", e))?;

    fs::write(&path, content).map_err(|e| format!("Failed to write history file: {}", e))?;

    Ok(())
}

/// Get all transcription history records
#[tauri::command]
pub fn get_history() -> Result<Vec<TranscriptionRecord>, String> {
    log::info!("Getting transcription history");
    let storage = load_history();
    Ok(storage.records)
}

/// Add a new transcription record to history
#[tauri::command]
pub fn add_history(
    text: String,
    duration_ms: Option<u64>,
    model: Option<String>,
) -> Result<TranscriptionRecord, String> {
    log::info!("Adding transcription to history: {} chars", text.len());

    let mut storage = load_history();

    let record = TranscriptionRecord {
        id: uuid::Uuid::new_v4().to_string(),
        text,
        timestamp: chrono::Utc::now().timestamp_millis(),
        duration_ms,
        model,
    };

    // Add to beginning of list (most recent first)
    storage.records.insert(0, record.clone());

    // Keep only last 100 records
    if storage.records.len() > 100 {
        storage.records.truncate(100);
    }

    save_history(&storage)?;

    Ok(record)
}

/// Delete a specific history entry by ID
#[tauri::command]
pub fn delete_history_entry(id: String) -> Result<(), String> {
    log::info!("Deleting history entry: {}", id);

    let mut storage = load_history();
    storage.records.retain(|r| r.id != id);
    save_history(&storage)?;

    Ok(())
}

/// Clear all history
#[tauri::command]
pub fn clear_history() -> Result<(), String> {
    log::info!("Clearing all history");

    let storage = HistoryStorage::default();
    save_history(&storage)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_history_path() {
        let path = get_history_path();
        assert!(path.ends_with("history.json"));
    }
}
