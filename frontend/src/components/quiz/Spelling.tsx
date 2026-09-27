import { useState } from 'react'
import type { WordLookupResult } from '../../lib/api'

export function Spelling({
  word,
  onResult,
}: {
  word: WordLookupResult
  onResult: (correct: boolean) => void
}) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState<'correct' | 'wrong' | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (checked) return
    const isCorrect = value.trim().toLowerCase() === word.text.trim().toLowerCase()
    setChecked(isCorrect ? 'correct' : 'wrong')
    onResult(isCorrect)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-400">Напишите слово, соответствующее переводу</p>
        <p className="mt-2 text-2xl font-semibold">{word.translation}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{word.meaning}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={checked !== null}
          placeholder="Введите слово…"
          className={`h-12 w-full rounded-xl border px-4 text-base outline-none focus:ring-2 disabled:opacity-70 ${
            checked === 'correct'
              ? 'border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-900/30'
              : checked === 'wrong'
                ? 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-900/30'
                : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900'
          }`}
        />
        {checked === 'wrong' && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Правильно: <span className="font-semibold text-gray-800 dark:text-gray-100">{word.text}</span>
          </p>
        )}
        {!checked && (
          <button
            type="submit"
            className="min-h-[48px] rounded-xl bg-blue-600 font-medium text-white hover:bg-blue-700"
          >
            Проверить
          </button>
        )}
      </form>
    </div>
  )
}
