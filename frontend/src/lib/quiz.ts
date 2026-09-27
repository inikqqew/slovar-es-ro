import { getUserId } from './userId'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

function authHeaders(): HeadersInit {
  return { 'x-user-id': getUserId() }
}

export type QuizType = 'fill_blank' | 'multiple_choice' | 'flashcard' | 'matching' | 'spelling'

export interface QuizProgress {
  id: string
  wordId: string
  quizType: QuizType
  attempts: number
  successRate: number
  nextReviewAt: string
  updatedAt: string
}

export async function fetchQuizProgress(): Promise<QuizProgress[]> {
  const res = await fetch(`${API_BASE}/quizzes/progress`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Ошибка загрузки прогресса: ${res.status}`)
  return res.json()
}

export async function recordQuizResult(wordId: string, quizType: QuizType, correct: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/quizzes/progress`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ wordId, quizType, correct }),
  })
  if (!res.ok) throw new Error(`Ошибка сохранения прогресса: ${res.status}`)
}

// Отбирает слова для сессии: сперва просроченные к повторению (nextReviewAt в
// прошлом) или ещё ни разу не пройденные в этом режиме, затем добирает
// случайными, если пул большой. Простая, но осмысленная приоритизация —
// полноценный SM-2 с "лёгкостью" каждой карточки оставлен на будущее.
export function pickDueFirst<T extends { id: string }>(
  words: T[],
  progress: QuizProgress[],
  quizType: QuizType,
  count: number,
): T[] {
  const progressByWord = new Map(progress.filter((p) => p.quizType === quizType).map((p) => [p.wordId, p]))
  const now = Date.now()

  const due: T[] = []
  const fresh: T[] = []
  const notDue: T[] = []

  for (const w of words) {
    const p = progressByWord.get(w.id)
    if (!p) fresh.push(w)
    else if (new Date(p.nextReviewAt).getTime() <= now) due.push(w)
    else notDue.push(w)
  }

  const shuffle = <U,>(arr: U[]) => arr.sort(() => Math.random() - 0.5)
  const ordered = [...shuffle(due), ...shuffle(fresh), ...shuffle(notDue)]
  return ordered.slice(0, count)
}

export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}
