import { Agent, DEFAULT_AGENT } from '../types';
import { deleteAgent } from '../storage';

interface Props {
  agents: Agent[];
  currentAgentId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onEdit: (agent: Agent) => void;
  onDelete: () => void;
  open: boolean;
  onClose: () => void;
}

export default function AgentSidebar({ agents, currentAgentId, onSelect, onNew, onEdit, onDelete, open, onClose }: Props) {
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Agents</h2>
          <button className="sidebar-close" onClick={onClose}>✕</button>
        </div>

        <div className="sidebar-section-label">Default</div>
        <button
          className={`agent-card ${currentAgentId === 'default' ? 'active' : ''}`}
          onClick={() => { onSelect('default'); onClose(); }}
        >
          <span className="agent-avatar">{DEFAULT_AGENT.emoji}</span>
          <div className="agent-info">
            <span className="agent-name">{DEFAULT_AGENT.name}</span>
            <span className="agent-desc">No system prompt</span>
          </div>
        </button>

        {agents.length > 0 && (
          <>
            <div className="sidebar-section-label">Custom Agents</div>
            {agents.map(agent => (
              <button
                key={agent.id}
                className={`agent-card ${currentAgentId === agent.id ? 'active' : ''}`}
                onClick={() => { onSelect(agent.id); onClose(); }}
                onContextMenu={e => { e.preventDefault(); handleDelete(agent); }}
              >
                <span className="agent-avatar">{agent.emoji}</span>
                <div className="agent-info">
                  <span className="agent-name">{agent.name}</span>
                  <span className="agent-desc">{agent.systemPrompt.slice(0, 40) || 'No prompt'}</span>
                </div>
                <button
                  className="agent-edit-btn"
                  onClick={e => { e.stopPropagation(); onEdit(agent); }}
                  title="Edit"
                >
                  ✏️
                </button>
              </button>
            ))}
          </>
        )}

        <button className="new-agent-btn" onClick={onNew}>
          + New Agent
        </button>
      </aside>
    </>
  );

  function handleDelete(agent: Agent) {
    if (confirm(`Delete "${agent.name}"?`)) {
      deleteAgent(agent.id);
      onDelete();
    }
  }
}
