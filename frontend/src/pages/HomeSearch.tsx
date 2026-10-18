import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addToHistory, clearHistory, getHistory } from '../lib/history'
import { fetchMyDictionary, type WordLookupResult } from '../lib/api'

export function HomeSearch() {
  const [term, setTerm] = useState('')
  const [history, setHistory] = useState<string[]>(getHistory)
  const [wordOfDay, setWordOfDay] = useState<WordLookupResult | null>(null)

  useEffect(() => {
    fetchMyDictionary()
      .then((words) => {
        if (!words.length) return
        const day = Math.floor(Date.now() / 86_400_000)
        setWordOfDay(words[day % words.length])
      })
      .catch(() => {})
  }, [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = term.trim()
    if (!trimmed) return
    addToHistory(trimmed)
    navigate(`/word/${encodeURIComponent(trimmed)}`)
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    navigate('/ocr', { state: { file } })
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="search-input" className="sr-only">
          Слово на испанском или румынском
        </label>
        <input
          id="search-input"
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Введите слово (ES/RO)…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base
            outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
            dark:border-gray-700 dark:bg-gray-900 dark:focus:border-blue-400 dark:focus:ring-blue-900"
        />
        <button
          type="submit"
          className="h-12 min-h-[44px] w-full rounded-xl bg-blue-600 text-base font-medium text-white
            transition-colors hover:bg-blue-700 active:bg-blue-800"
        >
          Перевести
        </button>
      </form>

      <div className="flex items-center gap-3 text-sm text-gray-400">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        или
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border
            border-gray-300 bg-white py-3 text-base font-medium text-gray-700 transition-colors
            hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <span aria-hidden="true">📷</span> Фото страницы
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-300
            bg-white px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50
            dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <span aria-hidden="true">🖼️</span> Из галереи
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhoto}
      />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

      {wordOfDay && (
        <button
          type="button"
          onClick={() => navigate(`/word/${encodeURIComponent(wordOfDay.text)}`)}
          className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-left dark:border-blue-900 dark:bg-blue-950"
        >
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Слово дня</p>
          <p className="text-xl font-semibold">{wordOfDay.text}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{wordOfDay.translation}</p>
        </button>
      )}

      {history.length > 0 && (
        <section className="mt-2">
          <div className="mb-2 flex items-center justify-between text-sm text-gray-400">
            <span>Недавние запросы</span>
            <button
              type="button"
              onClick={() => {
                clearHistory()
                setHistory([])
              }}
              className="min-h-[36px] px-2 text-blue-600 dark:text-blue-400"
            >
              Очистить
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => navigate(`/word/${encodeURIComponent(h)}`)}
                className="min-h-[40px] rounded-full border border-gray-300 px-3 py-1.5 text-sm
                  hover:border-blue-500 dark:border-gray-700"
              >
                {h}
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="mt-2 text-center text-sm text-gray-400">
        Сфотографируйте страницу книги или текста — распознаем все слова (испанский и румынский).
      </p>
    </div>
  )
}
