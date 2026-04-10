#!/usr/bin/env bash
set -euo pipefail

BONSAI_DIR="${BONSAI_DEMO_DIR:-$HOME/Bonsai-demo}"
PORT="${LLAMA_PORT:-8088}"

echo "🪴 Bonsai llama.cpp Server Setup"
echo "================================="

if [ ! -d "$BONSAI_DIR" ]; then
  echo "📥 Cloning Bonsai-demo..."
  git clone https://github.com/PrismML-Eng/Bonsai-demo.git "$BONSAI_DIR"
fi

cd "$BONSAI_DIR"

if [ ! -f "./setup.sh" ] && [ ! -d "models" ] && [ ! -f "llama-server" ]; then
  echo "📦 Running setup (downloads binaries + models)..."
  ./setup.sh
fi

echo ""
echo "🚀 Starting llama.cpp server on port $PORT..."
echo "   URL: http://localhost:$PORT"
echo "   Press Ctrl+C to stop"
echo ""

# Try the demo repo's script first, fall back to direct llama-server
if [ -f "./scripts/start_llama_server.sh" ]; then
  exec ./scripts/start_llama_server.sh
elif command -v llama-server &>/dev/null; then
  MODEL=$(find . -name "*.gguf" | head -1)
  if [ -z "$MODEL" ]; then
    echo "❌ No .gguf model found. Download from:"
    echo "   https://huggingface.co/prism-ml/Bonsai-8B-gguf"
    exit 1
  fi
  exec llama-server -m "$MODEL" --port "$PORT" --host 127.0.0.1
else
  echo "❌ llama-server binary not found."
  echo ""
  echo "Install options:"
  echo "  1. brew install llama.cpp"
  echo "  2. Or run the Bonsai-demo setup script"
  exit 1
fi
