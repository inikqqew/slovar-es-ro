import { useMemo, useState } from 'react'
import type { WordLookupResult } from '../../lib/api'
import { shuffle } from '../../lib/quiz'

function blankOutWord(sentence: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}\\b`, 'i')
  return sentence.replace(re, '_____')
}

export function FillBlank({
  word,
  pool,
  onResult,
}: {
  word: WordLookupResult
  pool: WordLookupResult[]
  onResult: (correct: boolean) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const example = word.examples[0] ?? ''
  const blanked = useMemo(() => blankOutWord(example, word.text), [example, word.text])

  const options = useMemo(() => {
    const distractors = shuffle(
      pool.filter((w) => w.id !== word.id && w.language === word.language && w.text !== word.text),
    )
      .slice(0, 3)
      .map((w) => w.text)
    return shuffle([word.text, ...distractors])
  }, [word, pool])

  function handleClick(option: string) {
    if (selected) return
    setSelected(option)
    onResult(option === word.text)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-400">Вставьте пропущенное слово</p>
        <p className="mt-2 text-xl font-medium leading-relaxed">{blanked}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        {options.map((option) => {
          const isCorrect = option === word.text
          const isSelected = option === selected
          const showState = selected !== null
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleClick(option)}
              disabled={selected !== null}
              className={`min-h-[48px] rounded-xl border px-4 py-3 text-left text-base font-medium transition-colors ${
                showState && isCorrect
                  ? 'border-green-400 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : showState && isSelected
                    ? 'border-red-400 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'border-gray-300 bg-white hover:border-blue-400 dark:border-gray-700 dark:bg-gray-900'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
