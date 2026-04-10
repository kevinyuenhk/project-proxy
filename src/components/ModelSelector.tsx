import { useState } from 'react'
import type { ModelInfo } from '../App'

interface ModelSelectorProps {
  models: ModelInfo[]
  selectedModel: string | null
  onSelect: (modelId: string) => void
  loading: boolean
  onFetchModels: () => void
}

export default function ModelSelector({ models, selectedModel, onSelect, loading, onFetchModels }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div style={{ position: 'relative', marginTop: '8px' }}>
      <button
        onClick={() => {
          if (models.length === 0) onFetchModels()
          setIsOpen(!isOpen)
        }}
        disabled={loading}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--bg-input)',
          color: selectedModel ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>
          {loading ? 'Loading model...' : selectedModel ? `🧠 ${selectedModel}` : 'Select model...'}
        </span>
        <span style={{ fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && models.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          overflow: 'hidden',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {models.map(model => (
            <button
              key={model.id}
              onClick={() => {
                onSelect(model.id)
                setIsOpen(false)
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>{model.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{model.vram}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
