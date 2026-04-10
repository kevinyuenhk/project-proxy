import { useState, useRef, useCallback } from 'react'
import ChatView from './components/ChatView'
import ModelSelector from './components/ModelSelector'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface ModelInfo {
  id: string
  name: string
  repo: string
  vram: string
}

// Capacitor bridge — uses native plugin on iOS, mock on web
const BonsaiPlugin = (window as any).Capacitor?.isNativePlatform()
  ? (window as any).Capacitor.Plugins?.BonsaiPlugin
  : null

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [currentModelId, setCurrentModelId] = useState<string | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const streamMsgId = useRef<string | null>(null)

  // Fetch available models
  const fetchModels = useCallback(async () => {
    try {
      if (BonsaiPlugin) {
        const result = await BonsaiPlugin.getModels()
        setModels(result.models || [])
      } else {
        // Mock models for web dev
        setModels([
          { id: 'Bonsai-1.7B-mlx-1bit', name: 'Bonsai 1.7B', repo: 'prism-ml/Bonsai-1.7B-mlx-1bit', vram: '~2 GB' },
          { id: 'Bonsai-4B-mlx-1bit', name: 'Bonsai 4B', repo: 'prism-ml/Bonsai-4B-mlx-1bit', vram: '~4 GB' },
          { id: 'Bonsai-8B-mlx-1bit', name: 'Bonsai 8B', repo: 'prism-ml/Bonsai-8B-mlx-1bit', vram: '~6 GB' },
        ])
      }
    } catch (e: any) {
      setError(`Failed to fetch models: ${e.message || e}`)
    }
  }, [])

  // Load model
  const loadModel = useCallback(async (modelId: string) => {
    setLoading(true)
    setError(null)
    try {
      if (BonsaiPlugin) {
        await BonsaiPlugin.loadModel({ modelId })
      }
      setSelectedModel(modelId)
      setModelLoaded(true)
      setCurrentModelId(modelId)
    } catch (e: any) {
      setError(`Failed to load model: ${e.message || e}`)
    } finally {
      setLoading(false)
    }
  }, [])

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !modelLoaded || isStreaming) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }
    streamMsgId.current = assistantMsg.id
    setMessages(prev => [...prev, assistantMsg])
    setIsStreaming(true)
    setError(null)

    try {
      if (BonsaiPlugin) {
        // Native streaming
        await BonsaiPlugin.startStream({
          prompt: content.trim(),
          systemPrompt: systemPrompt || undefined,
        })
      } else {
        // Mock response for web dev
        await new Promise(r => setTimeout(r, 1500))
        const fake = `Hello! I'm Bonsai (${selectedModel}). This is a mock response for web development. Connect via Capacitor on iOS to use the real model.\n\nYour prompt was: "${content.trim()}"`
        setMessages(prev =>
          prev.map(m => m.id === assistantMsg.id ? { ...m, content: fake } : m)
        )
      }
    } catch (e: any) {
      setError(`Generation failed: ${e.message || e}`)
    } finally {
      setIsStreaming(false)
      streamMsgId.current = null
    }
  }, [modelLoaded, isStreaming, systemPrompt, selectedModel])

  // Stop generation
  const stopGeneration = useCallback(async () => {
    if (BonsaiPlugin) {
      await BonsaiPlugin.stopGeneration()
    }
    setIsStreaming(false)
  }, [])

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // Listen for native stream events
  useState(() => {
    if (!BonsaiPlugin) return

    const tokenListener = BonsaiPlugin.addListener('streamToken', (data: any) => {
      const id = streamMsgId.current
      if (!id) return
      setMessages(prev =>
        prev.map(m => m.id === id ? { ...m, content: m.content + data.token } : m)
      )
    })

    const endListener = BonsaiPlugin.addListener('streamEnd', () => {
      setIsStreaming(false)
    })

    const errorListener = BonsaiPlugin.addListener('streamError', (data: any) => {
      setError(data.error)
      setIsStreaming(false)
    })

    return () => {
      tokenListener?.remove()
      endListener?.remove()
      errorListener?.remove()
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <header style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>🧠 Bonsai</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {modelLoaded && (
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: 'var(--success)',
                color: '#000',
                fontWeight: 600,
              }}>
                {currentModelId}
              </span>
            )}
            {messages.length > 0 && (
              <button onClick={clearMessages} style={btnGhost}>Clear</button>
            )}
          </div>
        </div>

        {/* Model selector */}
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onSelect={loadModel}
          loading={loading}
          onFetchModels={fetchModels}
        />

        {/* System prompt */}
        <input
          type="text"
          placeholder="System prompt (optional)"
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          style={{
            marginTop: '8px',
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </header>

      {/* Error bar */}
      {error && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(231, 76, 60, 0.15)',
          color: 'var(--danger)',
          fontSize: '13px',
          borderBottom: '1px solid rgba(231, 76, 60, 0.3)',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={btnGhost}>✕</button>
        </div>
      )}

      {/* Chat area */}
      <ChatView
        messages={messages}
        isStreaming={isStreaming}
        modelLoaded={modelLoaded}
        onSend={sendMessage}
        onStop={stopGeneration}
      />
    </div>
  )
}

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
  borderRadius: '6px',
  padding: '4px 10px',
  fontSize: '12px',
  cursor: 'pointer',
}
