import { getUserId } from './userId'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

function authHeaders(): HeadersInit {
  return { 'x-user-id': getUserId() }
}

export type ChatLanguage = 'es' | 'ro'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatSessionData {
  id: string
  language: ChatLanguage
  messages: ChatMessage[]
}

export async function fetchChatSession(language: ChatLanguage): Promise<ChatSessionData> {
  const res = await fetch(`${API_BASE}/chat?language=${language}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Ошибка загрузки чата: ${res.status}`)
  return res.json()
}

export async function sendChatMessage(sessionId: string, text: string): Promise<{ messages: ChatMessage[] }> {
  const res = await fetch(`${API_BASE}/chat/${sessionId}/messages`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Ошибка отправки сообщения: ${res.status}`)
  }
  return res.json()
}
