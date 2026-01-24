# Quick Start Guide

## For Developers

This guide helps you quickly understand and start working with the OpenWhispr frontend.

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd /home/francois/WebstormProjects/open-whispr-tauri
bun install
```

### 2. Run Development Server
```bash
bun run dev
```

### 3. Run Tauri App
```bash
bun run tauri dev
```

## 📁 Where to Find Things

### Need to add a new component?
→ `src/components/YourComponent.tsx`

### Need to manage state?
→ `src/stores/appStore.ts`

### Need to call backend?
→ `src/lib/tauri.ts`

### Need reusable logic?
→ `src/hooks/useYourHook.ts`

### Need types?
→ `src/types/index.ts`

## 🎯 Common Tasks

### Add a New Setting

1. Update the `Settings` interface in `src/lib/tauri.ts`:
```typescript
export interface Settings {
  hotkey: string;
  model: string;
  useGpu: boolean;
  language: string;
  yourNewSetting: string; // Add this
}
```

2. Update initial state in `src/stores/appStore.ts`:
```typescript
settings: {
  hotkey: "Ctrl+Shift+Space",
  model: "base",
  useGpu: false,
  language: "en",
  yourNewSetting: "default", // Add this
},
```

3. Add UI in `src/components/SettingsPanel.tsx`:
```typescript
<div>
  <Label>Your New Setting</Label>
  <Input
    value={settings.yourNewSetting}
    onChange={(e) => updateSettings({ yourNewSetting: e.target.value })}
  />
</div>
```

### Add a New Tauri Command

1. Add command in `src/lib/tauri.ts`:
```typescript
export async function yourNewCommand(param: string): Promise<void> {
  return invoke("your_new_command", { param });
}
```

2. Use in a hook or component:
```typescript
import { yourNewCommand } from "@/lib/tauri";

const handleClick = async () => {
  await yourNewCommand("value");
};
```

### Add a New Event Listener

1. Add event listener in `src/lib/tauri.ts`:
```typescript
export async function onYourEvent(
  callback: (data: YourDataType) => void
): Promise<() => void> {
  const unlisten = await listen<YourDataType>(
    "your-event-name",
    (event) => {
      callback(event.payload);
    }
  );
  return unlisten;
}
```

2. Use in a component:
```typescript
useEffect(() => {
  let unlisten: (() => void) | undefined;

  const setup = async () => {
    unlisten = await onYourEvent((data) => {
      console.log("Event received:", data);
    });
  };

  setup();

  return () => unlisten?.();
}, []);
```

### Create a New Hook

1. Create file `src/hooks/useYourFeature.ts`:
```typescript
import { useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import { yourTauriCommand } from "@/lib/tauri";

export function useYourFeature() {
  const { someState, setSomeState } = useAppStore();

  const doSomething = useCallback(async () => {
    try {
      const result = await yourTauriCommand();
      setSomeState(result);
    } catch (error) {
      console.error("Error:", error);
    }
  }, [setSomeState]);

  return {
    someState,
    doSomething,
  };
}
```

2. Export in `src/hooks/index.ts`:
```typescript
export { useYourFeature } from "./useYourFeature";
```

3. Use in component:
```typescript
import { useYourFeature } from "@/hooks";

function MyComponent() {
  const { someState, doSomething } = useYourFeature();
  // ...
}
```

## 🔍 Code Examples

### Reading from Store
```typescript
import { useAppStore } from "@/stores/appStore";

function MyComponent() {
  const isRecording = useAppStore(state => state.isRecording);
  return <div>{isRecording ? "Recording" : "Idle"}</div>;
}
```

### Updating Store
```typescript
import { useAppStore } from "@/stores/appStore";

function MyComponent() {
  const setRecording = useAppStore(state => state.setRecording);
  return <button onClick={() => setRecording(true)}>Start</button>;
}
```

### Calling Tauri Backend
```typescript
import { startRecording } from "@/lib/tauri";

async function handleStart() {
  try {
    await startRecording();
    console.log("Started!");
  } catch (error) {
    console.error("Failed to start:", error);
  }
}
```

### Using a Hook
```typescript
import { useRecording } from "@/hooks";

function RecordButton() {
  const { isRecording, startRecording, stopRecording } = useRecording();

  return (
    <button onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? "Stop" : "Start"}
    </button>
  );
}
```

## 🎨 UI Components (ShadCN)

### Button
```typescript
import { Button } from "@/components/ui/button";

<Button variant="default">Click Me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
```

### Switch
```typescript
import { Switch } from "@/components/ui/switch";

<Switch checked={enabled} onCheckedChange={setEnabled} />
```

### Select
```typescript
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Progress
```typescript
import { Progress } from "@/components/ui/progress";

<Progress value={50} />
```

### Card
```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

## 🐛 Debugging

### Check Store State
```typescript
// Add this to any component
const store = useAppStore();
console.log("Current store:", store);
```

### Check Event Listeners
```typescript
useEffect(() => {
  const setup = async () => {
    const unlisten = await onRecordingStatus((status) => {
      console.log("Recording status event:", status);
    });
  };
  setup();
}, []);
```

### Check Tauri Commands
```typescript
import { getSettings } from "@/lib/tauri";

const checkBackend = async () => {
  try {
    const settings = await getSettings();
    console.log("Backend settings:", settings);
  } catch (error) {
    console.error("Backend error:", error);
  }
};
```

## 📚 Documentation Files

- `FRONTEND_STRUCTURE.md` - Complete architecture overview
- `COMPONENT_USAGE.md` - Detailed usage examples
- `DATA_FLOW.md` - Visual data flow diagrams
- `FRONTEND_SETUP_SUMMARY.md` - What was created
- `QUICKSTART.md` - This file

## ⚡ Pro Tips

1. **Use TypeScript**: All types are already defined, use them!
2. **Use Hooks**: Don't call Tauri commands directly, use hooks
3. **Clean Up Events**: Always return cleanup functions from useEffect
4. **Error Handling**: Wrap async operations in try-catch
5. **Console Logging**: Use console.error for errors, console.log for debugging

## 🔗 Import Aliases

The project uses these import aliases:
- `@/components` → `src/components`
- `@/hooks` → `src/hooks`
- `@/lib` → `src/lib`
- `@/stores` → `src/stores`
- `@/types` → `src/types`

Example:
```typescript
import { useRecording } from "@/hooks";
import { Button } from "@/components/ui/button";
import { startRecording } from "@/lib/tauri";
```

## 🚨 Common Mistakes to Avoid

1. ❌ Don't mutate store state directly
   ```typescript
   // Wrong
   useAppStore.getState().settings.language = "es";

   // Right
   useAppStore.getState().setSettings({ language: "es" });
   ```

2. ❌ Don't forget event cleanup
   ```typescript
   // Wrong
   useEffect(() => {
     onRecordingStatus((status) => { ... });
   }, []);

   // Right
   useEffect(() => {
     let unlisten: (() => void) | undefined;
     const setup = async () => {
       unlisten = await onRecordingStatus((status) => { ... });
     };
     setup();
     return () => unlisten?.();
   }, []);
   ```

3. ❌ Don't call hooks conditionally
   ```typescript
   // Wrong
   if (condition) {
     const value = useAppStore(state => state.value);
   }

   // Right
   const value = useAppStore(state => state.value);
   if (condition) {
     // use value
   }
   ```

## 🎯 Next Steps

1. Read `FRONTEND_STRUCTURE.md` for full architecture
2. Check `COMPONENT_USAGE.md` for usage examples
3. Look at existing components in `src/components/`
4. Start building or integrating with backend!

## 💡 Need Help?

- Check the documentation files
- Look at existing component examples
- Console.log is your friend
- TypeScript errors are helpful - read them!

---

Happy coding! 🚀
