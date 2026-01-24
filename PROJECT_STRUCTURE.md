# OpenWhispr Tauri - Project Structure

## Complete Directory Tree

```
/home/francois/WebstormProjects/open-whispr-tauri/
│
├── src/                                    # Source code
│   ├── components/                         # React components
│   │   ├── ui/                             # ShadCN UI components
│   │   │   ├── button.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── select.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── card.tsx
│   │   │   └── label.tsx
│   │   │
│   │   ├── PillOverlay.tsx                 ✨ NEW - Floating status indicator
│   │   ├── SettingsPanel.tsx               ✨ NEW - Main settings UI
│   │   ├── ModelSelector.tsx               ✨ NEW - Model management
│   │   ├── HotkeyConfig.tsx                ✨ NEW - Hotkey configuration
│   │   ├── GpuToggle.tsx                   ✨ NEW - GPU toggle
│   │   └── index.ts                        ✨ NEW - Component exports
│   │
│   ├── hooks/                              ✨ NEW - Custom React hooks
│   │   ├── useRecording.ts                 ✨ NEW - Recording management
│   │   ├── useSettings.ts                  ✨ NEW - Settings management
│   │   ├── useHotkey.ts                    ✨ NEW - Hotkey handling
│   │   ├── useModels.ts                    ✨ NEW - Model management
│   │   └── index.ts                        ✨ NEW - Hook exports
│   │
│   ├── stores/                             ✨ NEW - State management
│   │   └── appStore.ts                     ✨ NEW - Zustand store
│   │
│   ├── lib/                                # Library code
│   │   ├── tauri.ts                        ✨ NEW - Tauri API wrappers
│   │   └── utils.ts                        # Utility functions
│   │
│   ├── types/                              ✨ NEW - TypeScript types
│   │   └── index.ts                        ✨ NEW - Type definitions
│   │
│   ├── App.tsx                             🔄 UPDATED - Main app component
│   ├── main.tsx                            # App entry point
│   └── index.css                           # Global styles
│
├── Documentation/                          ✨ NEW - Comprehensive docs
│   ├── FRONTEND_STRUCTURE.md               ✨ NEW - Architecture overview
│   ├── COMPONENT_USAGE.md                  ✨ NEW - Usage examples
│   ├── DATA_FLOW.md                        ✨ NEW - Data flow diagrams
│   ├── QUICKSTART.md                       ✨ NEW - Developer quick start
│   ├── FRONTEND_SETUP_SUMMARY.md           ✨ NEW - Setup summary
│   ├── FILES_CREATED.md                    ✨ NEW - File index
│   └── PROJECT_STRUCTURE.md                ✨ NEW - This file
│
├── package.json                            🔄 UPDATED - Added Zustand
├── tsconfig.json                           # TypeScript config
├── vite.config.ts                          # Vite config
└── tailwind.config.js                      # Tailwind config
```

## Key Directories Explained

### src/components/
React components organized by functionality:
- **ui/** - Base UI components from ShadCN
- **PillOverlay.tsx** - Floating recording status indicator
- **SettingsPanel.tsx** - Main settings interface container
- **ModelSelector.tsx** - Whisper model download/management UI
- **HotkeyConfig.tsx** - Hotkey recording and configuration
- **GpuToggle.tsx** - GPU acceleration toggle switch

### src/hooks/
Custom React hooks for business logic:
- **useRecording.ts** - Recording state and transcription handling
- **useSettings.ts** - Settings CRUD operations
- **useHotkey.ts** - Keyboard event capture and hotkey formatting
- **useModels.ts** - Model download/delete operations

### src/stores/
Zustand state management:
- **appStore.ts** - Global app state with recording, settings, and model states

### src/lib/
Utility libraries:
- **tauri.ts** - Typed wrappers for all Tauri backend commands and events
- **utils.ts** - General utility functions (existing)

### src/types/
TypeScript type definitions:
- **index.ts** - Centralized type exports

## Component Relationships

```
App
└─┬─ PillOverlay (reads: isRecording, isProcessing, transcription)
  │
  └─┬─ SettingsPanel
    │
    ├─┬─ Card: Hotkey Configuration
    │ └── HotkeyConfig (uses: useSettings, useHotkey)
    │
    ├─┬─ Card: Language
    │ └── Select (uses: useSettings)
    │
    ├─┬─ Card: Performance
    │ └── GpuToggle (uses: useSettings)
    │
    └─┬─ Card: Models
      └── ModelSelector (uses: useModels, useSettings)
```

## Data Flow Architecture

```
Components → Hooks → Tauri API → Backend
    ↓         ↓         ↓
    └────── Store ←──────┘
           (Zustand)
```

## Import Paths

The project uses path aliases:

```typescript
@/components/*  →  src/components/*
@/hooks/*       →  src/hooks/*
@/lib/*         →  src/lib/*
@/stores/*      →  src/stores/*
@/types/*       →  src/types/*
```

## File Extensions

- `.tsx` - React components (JSX)
- `.ts` - TypeScript files (no JSX)
- `.css` - Stylesheets
- `.md` - Markdown documentation

## TypeScript Configuration

All TypeScript files are:
- ✅ Strictly typed
- ✅ Using path aliases
- ✅ Compiling without errors
- ✅ Following React best practices

## Build Output

```
dist/                   # Production build output (not tracked)
└── assets/            # Bundled CSS, JS, and assets
```

## Important Files Not Shown

- `node_modules/` - Dependencies (not tracked)
- `.git/` - Git repository (not tracked)
- `target/` - Rust build output (not tracked)
- `src-tauri/` - Tauri/Rust backend code

## Quick Reference

### Adding New Component
→ Create in `src/components/YourComponent.tsx`
→ Export in `src/components/index.ts`

### Adding New Hook
→ Create in `src/hooks/useYourHook.ts`
→ Export in `src/hooks/index.ts`

### Adding New Type
→ Add to `src/types/index.ts`

### Adding New Tauri Command
→ Add to `src/lib/tauri.ts`

### Updating State
→ Update `src/stores/appStore.ts`

## Documentation Navigation

Start with:
1. **QUICKSTART.md** - Get up to speed quickly
2. **FRONTEND_STRUCTURE.md** - Understand architecture
3. **COMPONENT_USAGE.md** - See usage examples
4. **DATA_FLOW.md** - Understand data flow

Reference:
- **FRONTEND_SETUP_SUMMARY.md** - What was built
- **FILES_CREATED.md** - Complete file list
- **PROJECT_STRUCTURE.md** - This file

---

Legend:
- ✨ NEW - Newly created file
- 🔄 UPDATED - Modified existing file
- ✅ Ready for use
