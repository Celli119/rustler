import { useEffect } from "react";
import { History, Trash2, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TranscriptionItem } from "./TranscriptionItem";
import { useHistoryStore } from "@/stores/historyStore";

export function TranscriptionHistory() {
  const { records, isLoading, loadHistory, removeFromHistory, clearAllHistory } = useHistoryStore();

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Recent Transcriptions
        </CardTitle>
        {records.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-destructive hover:text-destructive"
            onClick={handleClearAll}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Mic className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No transcriptions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Press your hotkey to start recording
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] -mx-2">
            <div className="space-y-1 px-2">
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
      </CardContent>
    </Card>
  );
}
