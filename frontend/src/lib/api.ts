import { getUserId } from './userId'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

function authHeaders(): HeadersInit {
  return { 'x-user-id': getUserId() }
}

async function parseErrorOr<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Ошибка запроса: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface HealthResponse {
  status: 'ok'
  timestamp: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
  return res.json()
}

export type WordLanguage = 'es' | 'ro'
export type VerificationStatus = 'unverified' | 'ai_verified' | 'source_verified'

export interface WordLookupResult {
  id: string
  text: string
  language: WordLanguage
  translation: string
  meaning: string
  partOfSpeech: string | null
  gender: string | null
  examples: string[]
  status: VerificationStatus
  isCustom: boolean
  cached: boolean
  savedByMe: boolean
}

export async function lookupWord(text: string): Promise<WordLookupResult> {
  const res = await fetch(`${API_BASE}/words/lookup?text=${encodeURIComponent(text)}`, {
    headers: authHeaders(),
  })
  return parseErrorOr(res)
}

export interface DictionaryFilters {
  language?: WordLanguage
  status?: VerificationStatus
  q?: string
}

export async function fetchMyDictionary(filters: DictionaryFilters = {}): Promise<WordLookupResult[]> {
  const params = new URLSearchParams()
  if (filters.language) params.set('language', filters.language)
  if (filters.status) params.set('status', filters.status)
  if (filters.q) params.set('q', filters.q)

  const res = await fetch(`${API_BASE}/dictionary?${params.toString()}`, { headers: authHeaders() })
  return parseErrorOr(res)
}

export interface NewWordInput {
  text: string
  language: WordLanguage
  translation: string
  meaning: string
  example?: string
}

export async function addCustomWord(input: NewWordInput): Promise<WordLookupResult> {
  const res = await fetch(`${API_BASE}/dictionary/words`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseErrorOr(res)
}

export interface EditWordInput {
  translation?: string
  meaning?: string
  example?: string
}

export async function updateCustomWord(id: string, input: EditWordInput): Promise<WordLookupResult> {
  const res = await fetch(`${API_BASE}/dictionary/words/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseErrorOr(res)
}

export async function deleteCustomWord(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/dictionary/words/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return parseErrorOr(res)
}

export async function saveWord(wordId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/dictionary/save/${wordId}`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return parseErrorOr(res)
}

export async function unsaveWord(wordId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/dictionary/save/${wordId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return parseErrorOr(res)
}
