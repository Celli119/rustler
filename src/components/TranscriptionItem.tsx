import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TranscriptionRecord } from "@/lib/tauri";

interface TranscriptionItemProps {
  record: TranscriptionRecord;
  index: number;
  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
}

export function TranscriptionItem({
  record,
  index,
  onCopy,
  onDelete,
}: TranscriptionItemProps) {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="group flex items-start gap-3 py-2 border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors px-1">
        <span className="text-xs text-muted-foreground font-mono mt-0.5">
          #{index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground line-clamp-2">{record.text}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(record.timestamp)}
            </span>
            {record.model && (
              <span className="text-xs text-muted-foreground">
                · {record.model}
              </span>
            )}
          </div>
        </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onCopy(record.text)}
        >
          <Copy className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(record.id)}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}
