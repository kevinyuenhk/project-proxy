import type { Message } from '../bonsai-api';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: Props) {
  if (message.role === 'system') {
    return <div className="message system">{message.content}</div>;
  }

  return (
    <div className={`message ${message.role} ${isStreaming ? 'streaming' : ''}`}>
      {message.content || (isStreaming ? '' : '...')}
    </div>
  );
}
