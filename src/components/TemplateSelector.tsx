import { AGENT_TEMPLATES } from '../types';

interface Props {
  onSelect: (name: string, emoji: string, systemPrompt: string) => void;
  onClose: () => void;
}

export default function TemplateSelector({ onSelect, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="template-sheet" onClick={e => e.stopPropagation()}>
        <h3>Choose a Template</h3>
        <div className="template-grid">
          {AGENT_TEMPLATES.map(t => (
            <button
              key={t.name}
              className="template-card"
              onClick={() => onSelect(t.name, t.emoji, t.systemPrompt)}
            >
              <span className="template-emoji">{t.emoji}</span>
              <span className="template-name">{t.name}</span>
              <span className="template-desc">{t.description}</span>
            </button>
          ))}
        </div>
        <button className="template-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

const EMOJI_OPTIONS = [
  '🤖','👤','🧙','🦊','🐱','🐶','🦁','🐼','🦄','🐝',
  '🎨','🎵','📚','🔬','🔬','⚡','🔥','💎','🌟','🌈',
  '🚀','💡','🎯','🏆','💬','🧠','🎭','🌍','🍕','☕',
];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div className="emoji-picker">
      {EMOJI_OPTIONS.map(e => (
        <button
          key={e}
          className={`emoji-btn ${value === e ? 'active' : ''}`}
          onClick={() => onChange(e)}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
