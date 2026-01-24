import { Check, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/useSettings";
import { useModels } from "@/hooks/useModels";

export function ModelSelector() {
  const { models, downloadingModel, downloadProgress, downloadModel, deleteModel } = useModels();
  const { settings, updateSettings } = useSettings();

  const handleSelect = (modelId: string) => {
    updateSettings({ model: modelId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Whisper Models</CardTitle>
        <CardDescription>
          Download and manage Whisper models. Larger models are more accurate but slower.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {models.map((model) => {
          const isSelected = settings.model === model.id;
          const isDownloading = downloadingModel === model.id;
          const canSelect = model.downloaded && !isSelected;

          return (
            <div
              key={model.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : canSelect
                    ? "border-border hover:border-primary/50 cursor-pointer"
                    : "border-border"
              }`}
              onClick={() => canSelect && handleSelect(model.id)}
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.name}</span>
                    {isSelected && (
                      <Badge variant="default" className="text-xs">
                        <Check className="size-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{model.size}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isDownloading ? (
                  <div className="w-32 space-y-1">
                    <Progress value={downloadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {downloadProgress.toFixed(0)}%
                    </p>
                  </div>
                ) : model.downloaded ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteModel(model.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadModel(model.id);
                    }}
                    disabled={downloadingModel !== null}
                  >
                    <Download className="size-4 mr-1" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
