# BonsaiEngine

Swift Package wrapping the Bonsai LLM for on-device inference via MLX.

## Requirements

- Xcode 16+
- iOS 17+ / macOS 14+
- Apple Silicon (M1+)

## Setup

1. Clone with the prism branch dependencies:
   ```bash
   git clone --recursive https://github.com/PrismML-Eng/mlx-swift -b prism
   ```

2. If Bonsai models are private, set your HuggingFace token:
   ```bash
   export PRISM_HF_TOKEN=hf_your_token_here
   ```

## Usage

```swift
import BonsaiEngine

let engine = BonsaiEngine()
try await engine.loadModel(modelId: "Bonsai-8B-mlx-1bit")

// Full generation
let response = try await engine.generate(prompt: "Hello!")

// Streaming
try await engine.stream(prompt: "Tell me a story", onToken: { token in
    print(token, terminator: "")
})
```

## Available Models

| Model | HuggingFace Repo | VRAM |
|-------|-----------------|------|
| Bonsai 1.7B | `prism-ml/Bonsai-1.7B-mlx-1bit` | ~2 GB |
| Bonsai 4B | `prism-ml/Bonsai-4B-mlx-1bit` | ~4 GB |
| Bonsai 8B | `prism-ml/Bonsai-8B-mlx-1bit` | ~6 GB |

> **Note:** These repos may be private. Contact PrismML for access or provide
> `PRISM_HF_TOKEN` in your environment.
