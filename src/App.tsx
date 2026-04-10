import { useState, useCallback, useRef, useEffect } from 'react';
import ChatView from './components/ChatView';
import ModelSelector from './components/ModelSelector';
import AgentSidebar from './components/AgentSidebar';
import NewAgentModal from './components/NewAgentModal';
import { type ModelInfo, type Message, getBonsaiAPI, type APIStatus } from './bonsai-api';
import { type Agent, DEFAULT_AGENT } from './types';
import { loadAgents, loadAgentChats, createAgent, updateAgent as updateAgentStorage } from './storage';

const MODELS: ModelInfo[] = [
  { id: 'Bonsai-8B-mlx-1bit', name: 'Bonsai 8B', size: '1.15 GB', description: 'Best quality, slower' },
  { id: 'Bonsai-4B-mlx-1bit', name: 'Bonsai 4B', size: '0.57 GB', description: 'Balanced speed/quality' },
  { id: 'Bonsai-1.7B-mlx-1bit', name: 'Bonsai 1.7B', size: '0.27 GB', description: 'Fastest, smaller context' },
];

const DEFAULT_MODEL = MODELS[0];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelInfo>(DEFAULT_MODEL);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [apiStatus, setApiStatus] = useState<APIStatus>({ type: 'mock', label: 'Mock mode', connected: false });
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(() => {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1'
      ? 'http://localhost:8088'
      : `http://${host}:8088`;
  });
  const api = useRef(getBonsaiAPI().api);

  // Agent state
  const [currentAgentId, setCurrentAgentId] = useState('default');
  const [customAgents, setCustomAgents] = useState<Agent[]>(() => loadAgents().filter(a => a.id !== 'default'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const messageIdsRef = useRef<string[]>([]);

  const currentAgent = currentAgentId === 'default'
    ? DEFAULT_AGENT
    : customAgents.find(a => a.id === currentAgentId) ?? DEFAULT_AGENT;

  // Load chats when agent changes
  useEffect(() => {
    const chats = loadAgentChats(currentAgentId);
    setMessages(chats.map(c => ({ role: c.role as 'user' | 'assistant', content: c.content })));
    messageIdsRef.current = chats.map(c => c.id);
  }, [currentAgentId]);

  useEffect(() => {
    const { api: resolvedApi, status } = getBonsaiAPI(serverUrl);
    api.current = resolvedApi;
    setApiStatus(status);

    if (status.type === 'native') {
      resolvedApi.loadModel(DEFAULT_MODEL.id).then(() => setIsModelLoaded(true));
    } else if (status.type === 'http') {
      resolvedApi.loadModel(DEFAULT_MODEL.id).then(() => {
        setIsModelLoaded(true);
        setApiStatus(s => ({ ...s, connected: true, label: 'Connected to server' }));
      }).catch(() => {
        setIsModelLoaded(true);
        setApiStatus(s => ({ ...s, connected: false, label: 'Server not reachable' }));
      });
    } else {
      setIsModelLoaded(true);
    }
  }, []);

  const handleReconnect = useCallback(async (url: string) => {
    setServerUrl(url);
    setShowServerConfig(false);
    setIsModelLoaded(false);
    setIsModelLoading(true);

    const { api: newApi, status } = getBonsaiAPI(url);
    api.current = newApi;
    setApiStatus(status);

    try {
      await newApi.loadModel(DEFAULT_MODEL.id);
      setIsModelLoaded(true);
      setApiStatus(s => ({ ...s, connected: true, label: 'Connected to server' }));
    } catch {
      setIsModelLoaded(true);
      setApiStatus(s => ({ ...s, connected: false, label: 'Server not reachable' }));
    } finally {
      setIsModelLoading(false);
    }
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const userMsg: Message = { role: 'user', content: text };
    const assistantMsg: Message = { role: 'assistant', content: '' };

    // Persist user message
    const allChats = JSON.parse(localStorage.getItem('bonsai-chats') || '[]');
    const userChatId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const asstChatId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    allChats.push({ id: userChatId, agentId: currentAgentId, role: 'user', content: text, timestamp: Date.now() });
    allChats.push({ id: asstChatId, agentId: currentAgentId, role: 'assistant', content: '', timestamp: Date.now() });
    localStorage.setItem('bonsai-chats', JSON.stringify(allChats));

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    try {
      if (isStreaming) {
        await api.current.stopGeneration();
        return;
      }

      const history = [...messages, userMsg]
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const finalContent = currentAgent.systemPrompt
        ? await api.current.generate(history, (token) => {
            assistantMsg.content += token;
            setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
          }, currentAgent.systemPrompt)
        : await api.current.generate(history, (token) => {
            assistantMsg.content += token;
            setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
          });

      // Update assistant message in storage
      const chats = JSON.parse(localStorage.getItem('bonsai-chats') || '[]');
      const idx = chats.findIndex((m: any) => m.id === asstChatId);
      if (idx !== -1) { chats[idx].content = finalContent; localStorage.setItem('bonsai-chats', JSON.stringify(chats)); }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Cannot connect') || msg.includes('Failed to fetch')) {
        assistantMsg.content = `⚠️ Cannot connect to llama.cpp server at ${serverUrl}\n\nStart the server first:\n\n` +
          `\`\`\`\n./scripts/start_llama_server.sh\n\`\`\`\n` +
          `Then the server will be available at http://localhost:8088`;
        setApiStatus(s => ({ ...s, connected: false, label: 'Server not reachable' }));
      } else {
        assistantMsg.content = `Error: ${msg}`;
      }
      setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming, serverUrl, currentAgentId, currentAgent.systemPrompt]);

  const handleStop = useCallback(async () => {
    await api.current.stopGeneration();
    setIsStreaming(false);
  }, []);

  const handleModelSelect = useCallback(async (model: ModelInfo) => {
    setShowModelPicker(false);
    if (model.id === currentModel.id) return;

    setCurrentModel(model);
    setIsModelLoaded(false);
    setIsModelLoading(true);
    setMessages([]);

    try {
      await api.current.loadModel(model.id);
      setIsModelLoaded(true);
    } catch (err) {
      setMessages([{
        role: 'system',
        content: `Failed to load model: ${err instanceof Error ? err.message : String(err)}`,
      }]);
    } finally {
      setIsModelLoading(false);
    }
  }, [currentModel.id]);

  const handleAgentSelect = useCallback((id: string) => {
    setCurrentAgentId(id);
  }, []);

  const handleNewAgent = useCallback(() => {
    setEditingAgent(null);
    setModalOpen(true);
  }, []);

  const handleEditAgent = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setModalOpen(true);
  }, []);

  const handleSaveAgent = useCallback((name: string, emoji: string, systemPrompt: string) => {
    if (editingAgent) {
      updateAgentStorage(editingAgent.id, { name, emoji, systemPrompt });
    } else {
      createAgent(name, emoji, systemPrompt);
    }
    setCustomAgents(loadAgents().filter(a => a.id !== 'default'));
    setModalOpen(false);
    setEditingAgent(null);
  }, [editingAgent]);

  const handleDeleteAgent = useCallback(() => {
    setCustomAgents(loadAgents().filter(a => a.id !== 'default'));
    if (!customAgents.find(a => a.id === currentAgentId) && currentAgentId !== 'default') {
      setCurrentAgentId('default');
    }
  }, [customAgents, currentAgentId]);

  const statusText = apiStatus.type === 'native' ? '🟢 Native' :
    apiStatus.type === 'http' ? (apiStatus.connected ? '🟢 Server' : '🔴 Server') :
    '🟡 Mock';

  return (
    <>
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
          <h1>Project Proxy</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="current-agent-badge">
            {currentAgent.emoji} {currentAgent.name}
          </span>
          <button className="model-badge" onClick={() => setShowModelPicker(true)} style={{ position: 'relative' }}>
            <span className={`status-dot ${isModelLoaded ? 'loaded' : isModelLoading ? 'loading' : ''}`} />
            {currentModel.name}
          </button>
          <button className="model-badge" onClick={() => setShowServerConfig(!showServerConfig)} title="Connection settings" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
            {statusText}
          </button>
        </div>
      </header>

      <AgentSidebar
        agents={customAgents}
        currentAgentId={currentAgentId}
        onSelect={handleAgentSelect}
        onNew={handleNewAgent}
        onEdit={handleEditAgent}
        onDelete={handleDeleteAgent}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {showServerConfig && (
        <div style={{ padding: '12px 16px', background: '#1a1a2e', borderBottom: '1px solid #333', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: '#888' }}>Server:</span>
          <input type="text" value={serverUrl} onChange={e => setServerUrl(e.target.value)} style={{ flex: 1, background: '#0d0d1a', border: '1px solid #444', borderRadius: '6px', padding: '6px 10px', color: '#eee', fontSize: '0.85rem' }} placeholder="http://localhost:8088" />
          <button onClick={() => handleReconnect(serverUrl)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem' }}>Connect</button>
        </div>
      )}

      {apiStatus.type === 'http' && !apiStatus.connected && messages.length === 0 && !showServerConfig && (
        <div style={{ padding: '16px', textAlign: 'center', color: '#aaa', fontSize: '0.85rem', lineHeight: 1.6 }}>
          <p>⚠️ No llama.cpp server detected at <code>{serverUrl}</code></p>
          <p style={{ marginTop: 8 }}><strong>Quick start:</strong></p>
          <pre style={{ background: '#0d0d1a', padding: '12px', borderRadius: '8px', textAlign: 'left', fontSize: '0.8rem', overflow: 'auto' }}>
{`git clone https://github.com/PrismML-Eng/Bonsai-demo.git
cd Bonsai-demo
./setup.sh
./scripts/start_llama_server.sh`}
          </pre>
          <p style={{ marginTop: 8 }}>Then reload this page to connect.</p>
        </div>
      )}

      <ChatView messages={messages} isStreaming={isStreaming} onSend={handleSend} onStop={handleStop} disabled={!isModelLoaded} />

      {showModelPicker && (
        <ModelSelector models={MODELS} currentModel={currentModel} onSelect={handleModelSelect} onClose={() => setShowModelPicker(false)} />
      )}

      {modalOpen && (
        <NewAgentModal
          onSave={handleSaveAgent}
          onClose={() => { setModalOpen(false); setEditingAgent(null); }}
          initial={editingAgent ? { name: editingAgent.name, emoji: editingAgent.emoji, systemPrompt: editingAgent.systemPrompt } : undefined}
          title={editingAgent ? 'Edit Agent' : 'New Agent'}
        />
      )}
    </>
  );
}
