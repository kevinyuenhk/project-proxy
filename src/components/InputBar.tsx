import { useState, type FormEvent } from 'react';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled: boolean;
}

export default function InputBar({ onSend, onStop, isStreaming, disabled }: Props) {
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    if (isStreaming) {
      onStop();
    } else {
      onSend(trimmed);
      setText('');
    }
  };

  return (
    <form className="input-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={disabled ? 'Loading model...' : 'Type a message...'}
        disabled={disabled}
      />
      <button
        type="submit"
        className={`send-btn ${isStreaming ? 'stop-btn' : ''}`}
        disabled={disabled || (!isStreaming && !text.trim())}
      >
        {isStreaming ? '■' : '↑'}
      </button>
    </form>
  );
}
