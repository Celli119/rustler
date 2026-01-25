import { useEffect, useState } from "react";
import { Trash2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TranscriptionItem } from "@/components/TranscriptionItem";
import { useHistoryStore } from "@/stores/historyStore";

export function HistoryTab() {
  const { records, isLoading, loadHistory, removeFromHistory, clearAllHistory } =
    useHistoryStore();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

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
    await clearAllHistory();
    setClearDialogOpen(false);
  };

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transcriptions</CardTitle>
              <CardDescription>
                Your voice recording history
              </CardDescription>
            </div>
            {records.length > 0 && (
              <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4 mr-1" />
                      Clear All
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {records.length} transcription{records.length !== 1 ? "s" : ""} from your history. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleClearAll}>
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Mic className="size-10 text-primary mb-3" />
              <p className="text-foreground font-medium text-sm">No transcriptions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Press your hotkey to start recording
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="pr-4">
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
    </div>
  );
}
