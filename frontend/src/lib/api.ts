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
