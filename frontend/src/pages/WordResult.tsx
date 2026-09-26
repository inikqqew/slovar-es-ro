import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { lookupWord, type WordLookupResult } from '../lib/api'

const LANG_LABEL: Record<string, string> = { es: 'Испанский', ro: 'Румынский' }

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  unverified: {
    label: 'Не проверено',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  ai_verified: {
    label: 'Проверено AI',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  source_verified: {
    label: 'Проверено словарём',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
}

export function WordResult() {
  const { term } = useParams<{ term: string }>()
  const decoded = decodeURIComponent(term ?? '')

  const [data, setData] = useState<WordLookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    lookupWord(decoded)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [decoded])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <p className="text-sm">
          Ищем перевод… На бесплатном тарифе сервер может «просыпаться» до 50 сек.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-red-300 p-6 text-center dark:border-red-800">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={load}
          className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Повторить
        </button>
      </div>
    )
  }

  if (!data) return null

  const badge = STATUS_BADGE[data.status] ?? STATUS_BADGE.unverified

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-gray-400">{LANG_LABEL[data.language] ?? data.language}</p>
            <p className="text-2xl font-semibold">{data.text}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className="text-sm text-gray-400">Перевод</p>
          <p className="text-lg font-medium">{data.translation}</p>
        </div>

        {(data.partOfSpeech || data.gender) && (
          <p className="mt-2 text-sm text-gray-400">
            {[data.partOfSpeech, data.gender].filter(Boolean).join(' · ')}
          </p>
        )}

        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className="text-sm text-gray-400">Значение (rom.)</p>
          <p className="text-base">{data.meaning}</p>
        </div>

        {data.examples.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
            <p className="mb-1 text-sm text-gray-400">Примеры</p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {data.examples.map((ex) => (
                <li key={ex}>{ex}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled
        className="min-h-[44px] w-full rounded-xl border border-gray-300 bg-gray-100 py-3 text-base
          font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-800"
      >
        Добавить в мой словарь (Этап 4)
      </button>
    </div>
  )
}
