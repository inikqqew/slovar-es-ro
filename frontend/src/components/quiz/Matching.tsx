import { useMemo, useState } from 'react'
import type { WordLookupResult } from '../../lib/api'
import { shuffle } from '../../lib/quiz'

export function Matching({
  words,
  onPairResult,
  onComplete,
}: {
  words: WordLookupResult[]
  onPairResult: (wordId: string, correct: boolean) => void
  onComplete: () => void
}) {
  const leftOrder = useMemo(() => shuffle(words), [words])
  const rightOrder = useMemo(() => shuffle(words), [words])

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [mistaken, setMistaken] = useState<Set<string>>(new Set())
  const [wrongFlash, setWrongFlash] = useState<{ left: string; right: string } | null>(null)

  function pickLeft(id: string) {
    if (matched.has(id) || wrongFlash) return
    setSelectedLeft(id)
    if (selectedRight) attemptMatch(id, selectedRight)
  }

  function pickRight(id: string) {
    if (matched.has(id) || wrongFlash) return
    setSelectedRight(id)
    if (selectedLeft) attemptMatch(selectedLeft, id)
  }

  function attemptMatch(leftId: string, rightId: string) {
    if (leftId === rightId) {
      const wasMistaken = mistaken.has(leftId)
      const nextMatched = new Set(matched)
      nextMatched.add(leftId)
      setMatched(nextMatched)
      setSelectedLeft(null)
      setSelectedRight(null)
      onPairResult(leftId, !wasMistaken)
      if (nextMatched.size === words.length) onComplete()
    } else {
      setMistaken((prev) => new Set(prev).add(leftId).add(rightId))
      setWrongFlash({ left: leftId, right: rightId })
      setTimeout(() => {
        setWrongFlash(null)
        setSelectedLeft(null)
        setSelectedRight(null)
      }, 600)
    }
  }

  function tileClass(id: string, selected: string | null, side: 'left' | 'right') {
    if (matched.has(id)) return 'border-green-400 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300'
    if (wrongFlash && wrongFlash[side] === id) return 'border-red-400 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300'
    if (selected === id) return 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950'
    return 'border-gray-300 bg-white hover:border-blue-400 dark:border-gray-700 dark:bg-gray-900'
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm text-gray-400">Соедините слово с переводом</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {leftOrder.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={matched.has(w.id)}
              onClick={() => pickLeft(w.id)}
              className={`min-h-[48px] rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${tileClass(w.id, selectedLeft, 'left')}`}
            >
              {w.text}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {rightOrder.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={matched.has(w.id)}
              onClick={() => pickRight(w.id)}
              className={`min-h-[48px] rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${tileClass(w.id, selectedRight, 'right')}`}
            >
              {w.translation}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
