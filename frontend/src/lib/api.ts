const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

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
  cached: boolean
}

export async function lookupWord(text: string): Promise<WordLookupResult> {
  const res = await fetch(`${API_BASE}/words/lookup?text=${encodeURIComponent(text)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Ошибка поиска слова: ${res.status}`)
  }
  return res.json()
}
