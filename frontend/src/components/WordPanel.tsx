import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { lookupWord, saveWord, unsaveWord, type WordLookupResult } from '../lib/api'
import { addToHistory } from '../lib/history'
import { canSpeak, speak } from '../lib/speech'

export function WordPanel({ term, onClose }: { term: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [data, setData] = useState<WordLookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)
    lookupWord(term)
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [term])

  async function toggleSave() {
    if (!data) return
    setBusy(true)
    try {
      if (data.savedByMe) await unsaveWord(data.id)
      else await saveWord(data.id)
      setData({ ...data, savedByMe: !data.savedByMe })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-x-0 z-20 mx-auto max-w-2xl px-3"
      style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="truncate text-xl font-semibold">{term}</p>
              {canSpeak() && data && (
                <button
                  type="button"
                  onClick={() => speak(data.text, data.language)}
                  aria-label="Произнести слово"
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  🔊
                </button>
              )}
            </div>
            {!data && !error && <p className="text-sm text-gray-400">Ищем перевод…</p>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {data && (
              <>
                <p className="text-lg text-blue-600 dark:text-blue-400">{data.translation}</p>
                {data.meaning && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{data.meaning}</p>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>
        {data && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={toggleSave}
              disabled={busy}
              className={`min-h-[44px] flex-1 rounded-xl text-sm font-medium disabled:opacity-60 ${
                data.savedByMe
                  ? 'border border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {data.savedByMe ? '✓ В словаре' : 'В словарь'}
            </button>
            <button
              type="button"
              onClick={() => {
                addToHistory(term)
                navigate(`/word/${encodeURIComponent(term.toLowerCase())}`)
              }}
              className="min-h-[44px] rounded-xl border border-gray-300 px-4 text-sm font-medium dark:border-gray-700"
            >
              Подробнее
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
