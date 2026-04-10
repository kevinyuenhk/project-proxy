import MessageBubble from './MessageBubble'
import type { Message } from '../App'

interface ChatViewProps {
  messages: Message[]
  isStreaming: boolean
  modelLoaded: boolean
  onSend: (content: string) => void
  onStop: () => void
}

export default function ChatView({ messages, isStreaming, modelLoaded, onSend, onStop }: ChatViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            gap: '12px',
          }}>
            <span style={{ fontSize: '48px' }}>🌿</span>
            <p style={{ fontSize: '15px', fontWeight: 500 }}>
              {!modelLoaded ? 'Select a model to get started' : 'Start a conversation'}
            </p>
            <p style={{ fontSize: '13px' }}>
              {!modelLoaded ? 'Choose a Bonsai model from the dropdown above.' : 'Type a message below.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming && msg.id === messages[messages.length - 1]?.id && msg.role === 'assistant'} />
        ))}

        <div ref={el => el?.scrollIntoView({ behavior: 'smooth' })} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            placeholder={modelLoaded ? "Type a message..." : "Load a model first..."}
            disabled={!modelLoaded}
            rows={1}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const target = e.target as HTMLTextAreaElement
                if (target.value.trim()) {
                  onSend(target.value)
                  target.value = ''
                }
              }
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: modelLoaded ? 'var(--bg-input)' : 'var(--bg-tertiary)',
              color: modelLoaded ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              maxHeight: '120px',
            }}
          />
          {isStreaming ? (
            <button
              onClick={onStop}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid var(--danger)',
                background: 'transparent',
                color: 'var(--danger)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => {
                const textarea = document.querySelector('textarea') as HTMLTextAreaElement
                if (textarea?.value.trim()) {
                  onSend(textarea.value)
                  textarea.value = ''
                }
              }}
              disabled={!modelLoaded}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: 'none',
                background: modelLoaded ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: modelLoaded ? '#fff' : 'var(--text-muted)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: modelLoaded ? 'pointer' : 'not-allowed',
                flexShrink: 0,
              }}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
