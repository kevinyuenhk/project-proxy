import type { Message } from '../App'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className="fade-in"
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '12px',
      }}
    >
      <div style={{
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? 'var(--user-bubble)' : 'var(--assistant-bubble)',
        border: isUser ? '1px solid rgba(108, 92, 231, 0.3)' : '1px solid var(--border)',
        fontSize: '14px',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.content || (
          isStreaming ? (
            <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)', display: 'inline-block' }} />
              <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)', display: 'inline-block' }} />
              <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)', display: 'inline-block' }} />
            </span>
          ) : null
        )}
      </div>
    </div>
  )
}
