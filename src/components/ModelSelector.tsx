import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/hooks/useSettings";
import { useModels } from "@/hooks/useModels";

export function ModelSelector() {
  const { models, downloadingModel, downloadProgress, downloadModel, deleteModel } = useModels();
  const { settings, updateSettings } = useSettings();

  const handleSelect = (modelId: string) => {
    updateSettings({ model: modelId });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Whisper Models</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Download and manage Whisper models. Larger models are more accurate but slower.
        </p>
      </div>

      <div className="grid gap-4">
        {models.map((model) => (
          <Card key={model.id} className={settings.model === model.id ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{model.name}</CardTitle>
                  <CardDescription>Size: {model.size}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {model.downloaded ? (
                    <>
                      <Button
                        size="sm"
                        variant={settings.model === model.id ? "default" : "outline"}
                        onClick={() => handleSelect(model.id)}
                        disabled={settings.model === model.id}
                      >
                        {settings.model === model.id ? "Selected" : "Select"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteModel(model.id)}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => downloadModel(model.id)}
                      disabled={downloadingModel !== null}
                    >
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {downloadingModel === model.id && (
              <CardContent>
                <div className="space-y-2">
                  <Progress value={downloadProgress} />
                  <p className="text-xs text-muted-foreground text-center">
                    {downloadProgress.toFixed(0)}%
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
