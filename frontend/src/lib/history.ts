const KEY = 'dictionary-search-history'
const MAX = 12

export function getHistory(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function addToHistory(term: string): void {
  const t = term.trim().toLowerCase()
  if (!t) return
  const next = [t, ...getHistory().filter((x) => x !== t)].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(next))
}

export function clearHistory(): void {
  localStorage.removeItem(KEY)
}
