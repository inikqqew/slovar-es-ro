import { useState } from 'react'
import type { WordLookupResult } from '../../lib/api'

export function Flashcard({
  word,
  onResult,
}: {
  word: WordLookupResult
  onResult: (correct: boolean) => void
}) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-[220px] w-full max-w-sm flex-col items-center justify-center gap-2 rounded-2xl
          border border-gray-200 bg-white p-6 text-center shadow-sm transition-colors
          dark:border-gray-800 dark:bg-gray-900"
      >
        {!flipped ? (
          <p className="text-3xl font-semibold">{word.text}</p>
        ) : (
          <>
            <p className="text-2xl font-semibold">{word.translation}</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{word.meaning}</p>
          </>
        )}
        <p className="mt-4 text-xs text-gray-400">Нажмите, чтобы {flipped ? 'скрыть' : 'увидеть'} перевод</p>
      </button>

      <div className="flex w-full max-w-sm gap-3">
        <button
          type="button"
          onClick={() => onResult(false)}
          className="min-h-[48px] flex-1 rounded-xl border border-red-300 font-medium text-red-600
            hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          Не знаю
        </button>
        <button
          type="button"
          onClick={() => onResult(true)}
          className="min-h-[48px] flex-1 rounded-xl border border-green-300 font-medium text-green-700
            hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
        >
          Знаю
        </button>
      </div>
    </div>
  )
}
