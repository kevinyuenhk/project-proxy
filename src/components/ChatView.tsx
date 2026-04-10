import { useEffect, useRef } from 'react';
import type { Message } from '../bonsai-api';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';

interface Props {
  messages: Message[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  disabled: boolean;
}

export default function ChatView({ messages, isStreaming, onSend, onStop, disabled }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

  return (
    <>
      <div className="chat-area">
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            fontSize: 14,
            textAlign: 'center',
            padding: 32,
          }}>
            <div>
              <p style={{ fontSize: 24, marginBottom: 8 }}>✨</p>
              <p>Bonsai running locally on-device</p>
              <p style={{ marginTop: 4, fontSize: 13 }}>Start a conversation below</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            isStreaming={isStreaming && msg === lastAssistantMsg && !msg.content}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <InputBar
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        disabled={disabled}
      />
    </>
  );
}
