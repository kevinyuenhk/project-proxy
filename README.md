# Project Proxy

Hybrid iOS app running the Bonsai LLM natively via MLX Swift, with a web frontend for remote testing via Capacitor.

## Architecture

```
project-proxy/
├── BonsaiEngine/          # Swift Package — MLX Bonsai LLM wrapper
│   ├── Sources/BonsaiEngine/
│   │   ├── BonsaiEngine.swift      # Main engine: load, generate, stream
│   │   └── BonsaiModels.swift      # Model registry (1.7B / 4B / 8B)
│   └── Package.swift               # Depends on PrismML-Eng/mlx-swift (prism branch)
├── ios/
│   └── App/BonsaiPlugin.swift      # Capacitor plugin bridge
├── src/                   # React + TypeScript web frontend
│   ├── App.tsx                   # Main app with state management
│   ├── components/
│   │   ├── ChatView.tsx           # Chat interface + input
│   │   ├── MessageBubble.tsx      # Message rendering
│   │   └── ModelSelector.tsx      # Model dropdown
│   └── main.tsx
├── capacitor.config.ts
├── package.json
├── index.html
├── vite.config.ts
└── tsconfig.json
```

## Setup

### Prerequisites

- Xcode 16+
- Node.js 20+
- Apple Silicon Mac (M1+)
- HuggingFace token (Bonsai repos are private)

### 1. Web Frontend

```bash
cd project-proxy
npm install
npm run dev          # Dev server at http://localhost:3000
```

The web frontend works standalone with mock responses for UI development.

### 2. iOS / Capacitor

```bash
npm run build        # Build the web app
npx cap add ios      # Create iOS project (first time)
npx cap sync         # Sync web assets + plugins
npx cap open ios     # Open in Xcode
```

#### In Xcode:

1. Add `BonsaiEngine` as a local Swift Package dependency (path: `../BonsaiEngine`)
2. Add `BonsaiPlugin.swift` to the iOS app target
3. Register the plugin in your `AppDelegate.swift` or let Capacitor auto-discover it
4. Set `PRISM_HF_TOKEN` in your build scheme's environment variables (or code it in for testing)

### 3. HuggingFace Token

The Bonsai MLX models (`prism-ml/Bonsai-*-mlx-1bit`) are in private repos. You need:

```bash
export PRISM_HF_TOKEN=hf_your_token_here
```

Or set it in Xcode's scheme environment variables.

## BonsaiEngine API

```swift
let engine = BonsaiEngine()

// Load a model
try await engine.loadModel(modelId: "Bonsai-8B-mlx-1bit")

// Check state
engine.isModelLoaded   // true
engine.currentModelId  // "Bonsai-8B-mlx-1bit"

// Full generation
let response = try await engine.generate(prompt: "Hello!")
print(response)

// Streaming
try await engine.stream(prompt: "Tell me a story") { token in
    print(token, terminator: "")
}

// Stop
await engine.stopGeneration()

// Available models
let models = await engine.getModels()
```

## Capacitor Plugin API

Exposed to the web frontend via `BonsaiPlugin`:

| Method | Params | Returns |
|--------|--------|---------|
| `loadModel` | `{ modelId }` | `{ loaded, modelId }` |
| `generate` | `{ prompt, systemPrompt? }` | `{ text }` |
| `startStream` | `{ prompt, systemPrompt? }` | emits `streamToken` events |
| `stopGeneration` | — | — |
| `getModels` | — | `{ models: [...] }` |
| `isLoaded` | — | `{ loaded, modelId? }` |

### Stream Events

- `streamStart` — streaming begun
- `streamToken` — `{ token: string }` each token
- `streamEnd` — streaming complete
- `streamError` — `{ error: string }` on failure

## Available Models

| Model | Repo | VRAM |
|-------|------|------|
| Bonsai 1.7B | `prism-ml/Bonsai-1.7B-mlx-1bit` | ~2 GB |
| Bonsai 4B | `prism-ml/Bonsai-4B-mlx-1bit` | ~4 GB |
| Bonsai 8B | `prism-ml/Bonsai-8B-mlx-1bit` | ~6 GB |

## Development Notes

- The web frontend works standalone with mock responses — no iOS device needed for UI work
- `mlx-swift-lm` is NOT a separate repo under PrismML-Eng; the LM code is bundled in the `PrismML-Eng/mlx-swift` fork (prism branch)
- The scaffold targets the upstream `mlx-swift-lm` v3 API patterns (`loadModel`, `ChatSession`, `ModelContainer`)
- iOS on-device inference requires Apple Silicon (A12+ for 1.7B, M1+ recommended for 4B/8B)
