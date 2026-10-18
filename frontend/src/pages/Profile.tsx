import { useEffect, useMemo, useState } from 'react'
import { fetchHealth, fetchMyDictionary, type WordLookupResult } from '../lib/api'
import { fetchQuizProgress, type QuizProgress, type QuizType } from '../lib/quiz'
import { useTheme } from '../theme/ThemeContext'
import { TransferProfile } from '../components/TransferProfile'

type ServerStatus = 'checking' | 'online' | 'offline'

const QUIZ_LABEL: Record<QuizType, string> = {
  fill_blank: 'Вставь слово',
  multiple_choice: 'Подбери перевод',
  flashcard: 'Флеш-карты',
  matching: 'Сопоставление',
  spelling: 'Правописание',
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}

export function Profile() {
  const { theme, toggleTheme } = useTheme()
  const [status, setStatus] = useState<ServerStatus>('checking')
  const [words, setWords] = useState<WordLookupResult[] | null>(null)
  const [progress, setProgress] = useState<QuizProgress[]>([])

  useEffect(() => {
    let cancelled = false
    fetchHealth()
      .then(() => !cancelled && setStatus('online'))
      .catch(() => !cancelled && setStatus('offline'))
    Promise.all([fetchMyDictionary(), fetchQuizProgress()])
      .then(([w, p]) => {
        if (cancelled) return
        setWords(w)
        setProgress(p)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    if (!words) return null
    const perWord = new Map<string, { attempts: number; correct: number }>()
    for (const p of progress) {
      const cur = perWord.get(p.wordId) ?? { attempts: 0, correct: 0 }
      cur.attempts += p.attempts
      cur.correct += (p.successRate / 100) * p.attempts
      perWord.set(p.wordId, cur)
    }
    const learned = words.filter((w) => {
      const s = perWord.get(w.id)
      return s && s.attempts >= 3 && s.correct / s.attempts >= 0.8
    }).length
    const now = Date.now()
    const due = new Set(progress.filter((p) => new Date(p.nextReviewAt).getTime() <= now).map((p) => p.wordId))

    const perMode = (Object.keys(QUIZ_LABEL) as QuizType[]).map((type) => {
      const rows = progress.filter((p) => p.quizType === type)
      const attempts = rows.reduce((s, r) => s + r.attempts, 0)
      const correct = rows.reduce((s, r) => s + (r.successRate / 100) * r.attempts, 0)
      return { type, attempts, rate: attempts ? Math.round((correct / attempts) * 100) : null }
    })

    return {
      total: words.length,
      custom: words.filter((w) => w.isCustom).length,
      verified: words.filter((w) => w.status !== 'unverified').length,
      learned,
      due: due.size,
      perMode,
    }
  }, [words, progress])

  function exportJson() {
    if (!words) return
    download('slovar.json', JSON.stringify(words, null, 2), 'application/json')
  }

  function exportCsv() {
    if (!words) return
    const header = 'word,language,translation,meaning,example,status'
    const rows = words.map((w) =>
      [w.text, w.language, w.translation, w.meaning, w.examples[0] ?? '', w.status].map(csvCell).join(','),
    )
    download('slovar.csv', '﻿' + [header, ...rows].join('\n'), 'text/csv;charset=utf-8')
  }

  const card = 'rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900'
  const h2 = 'mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400'

  return (
    <div className="flex flex-col gap-4">
      <section className={card}>
        <h2 className={h2}>Прогресс</h2>
        {!stats && <p className="text-sm text-gray-400">Статистика появится, когда сервер будет доступен.</p>}
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-3 text-center">
              {[
                ['Слов в словаре', stats.total],
                ['Выучено', stats.learned],
                ['Своих слов', stats.custom],
                ['К повторению', stats.due],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            <ul className="mt-4 flex flex-col gap-1 text-sm">
              {stats.perMode.map((m) => (
                <li key={m.type} className="flex justify-between">
                  <span>{QUIZ_LABEL[m.type]}</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {m.rate === null ? '—' : `${m.rate}% · ${m.attempts} поп.`}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={card}>
        <h2 className={h2}>Перенос на другое устройство</h2>
        <TransferProfile />
      </section>

      <section className={card}>
        <h2 className={h2}>Экспорт словаря</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!words?.length}
            className="min-h-[44px] flex-1 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50 dark:border-gray-700"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={exportJson}
            disabled={!words?.length}
            className="min-h-[44px] flex-1 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50 dark:border-gray-700"
          >
            JSON
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}>Настройки</h2>
        <div className="flex items-center justify-between">
          <span className="text-base">Тёмная тема</span>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Тёмная тема"
            onClick={toggleTheme}
            className={`relative h-8 w-14 rounded-full transition-colors ${
              theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}>Статус сервера</h2>
        <div className="flex items-center gap-2 text-base">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === 'online' ? 'bg-green-500' : status === 'offline' ? 'bg-red-500' : 'animate-pulse bg-gray-400'
            }`}
          />
          {status === 'checking' && 'Проверка соединения…'}
          {status === 'online' && 'Сервер доступен'}
          {status === 'offline' && 'Сервер недоступен (на бесплатном тарифе первый запрос после простоя — до 50 сек)'}
        </div>
      </section>
    </div>
  )
}
