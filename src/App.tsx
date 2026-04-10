import { useState, useCallback, useRef, useEffect } from 'react';
import ChatView from './components/ChatView';
import ModelSelector from './components/ModelSelector';
import { type ModelInfo, type Message, getBonsaiAPI } from './bonsai-api';

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
  const api = useRef(getBonsaiAPI());

  useEffect(() => {
    // Check if native plugin is available
    const available = api.current.isNativeAvailable();
    if (available) {
      api.current.loadModel(DEFAULT_MODEL.id).then(() => setIsModelLoaded(true));
    }
    // In mock mode, model is "loaded" immediately
    if (!available) setIsModelLoaded(true);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const userMsg: Message = { role: 'user', content: text };
    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    try {
      if (isStreaming) {
        await api.current.stopGeneration();
        return;
      }

      // Get conversation history for context
      const history = [...messages, userMsg]
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      await api.current.generate(history, (token) => {
        assistantMsg.content += token;
        setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
      });
    } catch (err) {
      assistantMsg.content = `Error: ${err instanceof Error ? err.message : String(err)}`;
      setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming]);

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

  const isMockMode = !api.current.isNativeAvailable();

  return (
    <>
      <header className="header">
        <h1>Project Proxy</h1>
        <button className="model-badge" onClick={() => setShowModelPicker(true)}>
          <span className={`status-dot ${isModelLoaded ? 'loaded' : isModelLoading ? 'loading' : ''}`} />
          {currentModel.name}
          {isMockMode && ' (mock)'}
        </button>
      </header>

      <ChatView
        messages={messages}
        isStreaming={isStreaming}
        onSend={handleSend}
        onStop={handleStop}
        disabled={!isModelLoaded}
      />

      {showModelPicker && (
        <ModelSelector
          models={MODELS}
          currentModel={currentModel}
          onSelect={handleModelSelect}
          onClose={() => setShowModelPicker(false)}
        />
      )}
    </>
  );
}
