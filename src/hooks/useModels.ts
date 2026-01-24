import { useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import {
  getAvailableModels,
  downloadModel,
  deleteModel,
  onDownloadProgress,
} from "@/lib/tauri";

export function useModels() {
  const { models, downloadingModel, downloadProgress, setModels, setDownloading } =
    useAppStore();

  // Load models on mount and set up download progress listener
  useEffect(() => {
    const loadModels = async () => {
      try {
        const availableModels = await getAvailableModels();
        setModels(availableModels);
      } catch (error) {
        console.error("Failed to load models:", error);
      }
    };

    loadModels();

    let unlisten: (() => void) | undefined;
    const setupListener = async () => {
      unlisten = await onDownloadProgress((progress) => {
        setDownloading(progress.modelId, progress.percentage);
      });
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, [setModels, setDownloading]);

  const handleDownload = useCallback(
    async (modelId: string) => {
      try {
        setDownloading(modelId, 0);
        await downloadModel(modelId);
        // Refresh models list
        const updatedModels = await getAvailableModels();
        setModels(updatedModels);
        setDownloading(null, 0);
      } catch (error) {
        console.error("Failed to download model:", error);
        setDownloading(null, 0);
        throw error;
      }
    },
    [setModels, setDownloading]
  );

  const handleDelete = useCallback(
    async (modelId: string) => {
      try {
        await deleteModel(modelId);
        // Refresh models list
        const updatedModels = await getAvailableModels();
        setModels(updatedModels);
      } catch (error) {
        console.error("Failed to delete model:", error);
        throw error;
      }
    },
    [setModels]
  );

  return {
    models,
    downloadingModel,
    downloadProgress,
    downloadModel: handleDownload,
    deleteModel: handleDelete,
  };
}
