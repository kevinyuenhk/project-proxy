# Project Proxy

Hybrid iOS app running **Bonsai 1-bit LLMs** on-device via **MLX** (PrismML fork) + **Capacitor** web frontend.

## Architecture

- **Web frontend**: React + Vite + TypeScript — chat UI with streaming support
- **Native bridge**: Capacitor plugin (Swift) exposes model operations to the web layer
- **MLX engine**: PrismML's fork of MLX Swift provides custom 1-bit dequantization kernels
- **Models**: Bonsai 8B/4B/1.7B from HuggingFace (Apache 2.0, no auth needed)

## Prerequisites

- **macOS** with Apple Silicon (M1+)
- **Xcode 16+** (for iOS native build)
- **Node.js 20+** and npm
- **iOS 17+** target

## Quick Start (Web Dev — Mock Mode)

```bash
cd project-proxy
npm install
npm run dev
# Open http://localhost:3000 — works in any browser with simulated responses
```

## macOS / Web — llama.cpp Server Mode

You can run Bonsai on macOS using a llama.cpp server instead of the iOS native plugin. The web UI auto-detects the server and connects via HTTP.

### Setup

```bash
# 1. Clone and set up the Bonsai demo (downloads llama.cpp binary + GGUF model)
git clone https://github.com/PrismML-Eng/Bonsai-demo.git ~/Bonsai-demo
cd ~/Bonsai-demo
./setup.sh

# 2. Start the llama.cpp server
./scripts/start_llama_server.sh
# Server runs at http://localhost:8080

# 3. In another terminal, start the web UI
cd project-proxy
npm install
npm run dev
# Open http://localhost:3000 — the UI will connect to the server automatically
```

Or use the helper script:

```bash
./scripts/start-server.sh
```

### How it works

- The web UI checks for the native Capacitor plugin first
- If not available (running in a browser), it connects to `http://localhost:8080` via the OpenAI-compatible API
- A status indicator in the header shows the connection state (🟢 Server / 🔴 Server / 🟡 Mock)
- Click the status badge to configure a custom server URL
- If the server isn't running, the UI shows setup instructions

### GGUF Model

The llama.cpp server uses the GGUF quantized model from [prism-ml/Bonsai-8B-gguf](https://huggingface.co/prism-ml/Bonsai-8B-gguf) (public, no auth needed).

## iOS Build

### 1. Install dependencies & build web

```bash
npm install
npm run build
```

### 2. Add iOS platform

```bash
npx cap add ios
npx cap sync ios
```

### 3. Integrate the Bonsai native plugin

In Xcode (after `npx cap open ios`):

1. **Add Swift Package dependencies** to your project:
   - `https://github.com/PrismML-Eng/mlx-swift.git` — branch `prism` (CRITICAL: upstream MLX lacks 1-bit kernels)
   - `https://github.com/ml-explore/mlx-swift-lm.git` — branch `main`

2. **Add source files** from `ios/Sources/` to your Xcode target:
   - `BonsaiEngine/BonsaiEngine.swift`
   - `BonsaiPlugin/BonsaiPlugin.swift`

3. **Register the plugin** in your `AppDelegate.swift`:
   ```swift
   import Capacitor

   func application(_ application: UIApplication, didFinishLaunchingWithOptions ...) -> Bool {
       // Auto-registration handled by CAP_PLUGIN macro
       return true
   }
   ```

4. **Set minimum deployment target** to iOS 17.0+

5. **Build & run** on a real device (Metal performance required for practical inference)

### 4. Run

```bash
npx cap run ios
# or open in Xcode: npx cap open ios
```

## Models

All models are public on HuggingFace, no token required:

| Model | Repo | Size |
|-------|------|------|
| Bonsai 8B | `prism-ml/Bonsai-8B-mlx-1bit` | 1.15 GB |
| Bonsai 4B | `prism-ml/Bonsai-4B-mlx-1bit` | 0.57 GB |
| Bonsai 1.7B | `prism-ml/Bonsai-1.7B-mlx-1bit` | 0.27 GB |

Models are downloaded on first load and cached in the app's Documents directory.

**Default model**: Bonsai 8B (best quality). Use the model picker to switch sizes.

### Memory Requirements (approximate)

| Model | Context 4K | Context 32K |
|-------|-----------|-------------|
| 8B | ~2.5 GB | ~6 GB |
| 4B | ~1.5 GB | ~3 GB |
| 1.7B | ~0.8 GB | ~1.5 GB |

> **Simulator note**: The iOS Simulator has limited GPU resources. For usable inference speeds, run on a real Apple Silicon device (iPhone 15 Pro+ or iPad with M1+).

## Why PrismML Fork?

Bonsai models use **1-bit quantization** — a novel compression format where each weight is stored in a single bit. This requires custom Metal kernels for dequantization that are **not yet upstream** in Apple's MLX or llama.cpp.

| Component | PrismML Fork | Upstream |
|-----------|-------------|----------|
| MLX Swift | ✅ 1-bit kernels | ❌ Missing |
| MLX Python | ✅ 1-bit kernels | ❌ Missing |
| llama.cpp | ✅ Metal + CPU | ❌ Missing (PR pending) |

Using the upstream `ml-explore/mlx-swift` will fail to load Bonsai models with errors about unsupported quantization types.

## Project Structure

```
├── src/                          # Web frontend (React + Vite + TS)
│   ├── App.tsx                   # Main app component
│   ├── App.css                   # Dark theme styles
│   ├── main.tsx                  # Entry point
│   ├── bonsai-api.ts             # Plugin API abstraction (mock + native + HTTP)
│   └── components/
│       ├── ChatView.tsx          # Chat message list + scroll
│       ├── MessageBubble.tsx     # Single message render
│       ├── InputBar.tsx          # Text input + send/stop button
│       └── ModelSelector.tsx     # Bottom sheet model picker
├── ios/
│   ├── Package.swift             # Swift package definition
│   └── Sources/
│       ├── BonsaiEngine/         # Core MLX inference engine
│       │   └── BonsaiEngine.swift
│       ├── BonsaiPlugin/         # Capacitor plugin bridge
│       │   └── BonsaiPlugin.swift
│       └── BonsaiPluginObjC/     # ObjC registration macro
│           └── BonsaiPluginObjC.m
├── package.json
├── tsconfig.json
├── vite.config.ts
├── capacitor.config.ts
├── index.html
└── README.md
```

## Capacitor Plugin API

The native plugin exposes these methods to the web layer:

| Method | Description |
|--------|-------------|
| `loadModel({ modelId })` | Download + load a model |
| `generate({ messages, stream })` | Generate response, stream emits `streamToken` events |
| `stopGeneration()` | Cancel ongoing generation |
| `getModels()` | List available models |
| `getLoadedModel()` | Current model info |
| `getPerformance()` | Memory usage, tokens/sec |

## Mock Mode

When running in a browser (not inside Capacitor), the app uses `MockBonsaiAPI` which provides:
- Simulated streaming responses with realistic delays
- Contextual responses to common prompts ("hello", "who are you", etc.)
- Full UI functionality for development without Xcode

## License

Apache 2.0 (Bonsai models) + MIT (code)
