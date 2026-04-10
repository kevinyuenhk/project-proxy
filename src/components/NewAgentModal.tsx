import { useState } from 'react';
import { EmojiPicker } from './TemplateSelector';
import TemplateSelector from './TemplateSelector';

interface Props {
  onSave: (name: string, emoji: string, systemPrompt: string) => void;
  onClose: () => void;
  initial?: { name: string; emoji: string; systemPrompt: string };
  title?: string;
}

export default function NewAgentModal({ onSave, onClose, initial, title = 'New Agent' }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🤖');
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? '');
  const [showTemplates, setShowTemplates] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(name.trim(), emoji, systemPrompt.trim());
    onClose();
  };

  const handleTemplate = (tName: string, tEmoji: string, tPrompt: string) => {
    setShowTemplates(false);
    setName(name || tName);
    setEmoji(tEmoji);
    setSystemPrompt(tPrompt);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="agent-modal" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>

        <label className="field-label">Avatar</label>
        <EmojiPicker value={emoji} onChange={setEmoji} />

        <label className="field-label">Name</label>
        <input
          className="field-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Translator"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />

        <label className="field-label">
          System Prompt
          <button className="hint-btn" onClick={() => setShowTemplates(true)}>Use template…</button>
        </label>
        <textarea
          className="field-textarea"
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          placeholder="Define how this agent should behave…"
          rows={4}
        />

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!name.trim()}>
            {initial ? 'Save' : 'Create'}
          </button>
        </div>
      </div>

      {showTemplates && (
        <TemplateSelector
          onSelect={handleTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
