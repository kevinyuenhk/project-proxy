import { Agent, ChatMessage, DEFAULT_AGENT } from './types';

const AGENTS_KEY = 'bonsai-agents';
const CHATS_KEY = 'bonsai-chats';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// --- Agents ---

export function loadAgents(): Agent[] {
  try {
    const raw = localStorage.getItem(AGENTS_KEY);
    if (!raw) return [DEFAULT_AGENT];
    const agents: Agent[] = JSON.parse(raw);
    // Ensure default agent always present
    if (!agents.some(a => a.id === 'default')) {
      return [DEFAULT_AGENT, ...agents];
    }
    return agents;
  } catch {
    return [DEFAULT_AGENT];
  }
}

export function saveAgents(agents: Agent[]): void {
  localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
}

export function createAgent(name: string, emoji: string, systemPrompt: string): Agent {
  const agent: Agent = { id: uid(), name, emoji, systemPrompt, createdAt: Date.now(), updatedAt: Date.now() };
  const agents = loadAgents();
  agents.push(agent);
  saveAgents(agents);
  return agent;
}

export function updateAgent(id: string, updates: Partial<Pick<Agent, 'name' | 'emoji' | 'systemPrompt'>>): Agent | null {
  const agents = loadAgents();
  const idx = agents.findIndex(a => a.id === id);
  if (idx === -1 || agents[idx].id === 'default') return null;
  agents[idx] = { ...agents[idx], ...updates, updatedAt: Date.now() };
  saveAgents(agents);
  return agents[idx];
}

export function deleteAgent(id: string): boolean {
  const agents = loadAgents();
  const filtered = agents.filter(a => a.id !== id && a.id !== 'default');
  if (filtered.length === agents.length) return false;
  saveAgents([DEFAULT_AGENT, ...filtered]);
  deleteAgentChats(id);
  return true;
}

// --- Chat Messages ---

export function loadChats(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveChats(chats: ChatMessage[]): void {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function loadAgentChats(agentId: string): ChatMessage[] {
  return loadChats().filter(m => m.agentId === agentId).sort((a, b) => a.timestamp - b.timestamp);
}

export function addChatMessage(agentId: string, role: 'user' | 'assistant', content: string): ChatMessage {
  const msg: ChatMessage = { id: uid(), agentId, role, content, timestamp: Date.now() };
  const chats = loadChats();
  chats.push(msg);
  saveChats(chats);
  return msg;
}

export function updateChatMessage(id: string, content: string): void {
  const chats = loadChats();
  const idx = chats.findIndex(m => m.id === id);
  if (idx !== -1) {
    chats[idx].content = content;
    saveChats(chats);
  }
}

export function deleteAgentChats(agentId: string): void {
  const chats = loadChats().filter(m => m.agentId !== agentId);
  saveChats(chats);
}
