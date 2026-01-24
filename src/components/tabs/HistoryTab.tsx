import { useEffect } from "react";
import { History, Trash2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TranscriptionItem } from "@/components/TranscriptionItem";
import { useHistoryStore } from "@/stores/historyStore";

export function HistoryTab() {
  const { records, isLoading, loadHistory, removeFromHistory, clearAllHistory } =
    useHistoryStore();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDelete = async (id: string) => {
    await removeFromHistory(id);
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear all history?")) {
      await clearAllHistory();
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="size-5" />
          <h2 className="text-lg font-semibold">Recent Transcriptions</h2>
        </div>
        {records.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleClearAll}
          >
            <Trash2 className="size-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      ) : records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Mic className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No transcriptions yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Press your hotkey to start recording
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {records.map((record, index) => (
              <TranscriptionItem
                key={record.id}
                record={record}
                index={index}
                onCopy={handleCopy}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
