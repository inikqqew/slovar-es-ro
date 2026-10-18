import { useRef, useState } from 'react'
import type { WordLookupResult } from '../../lib/api'
import { canSpeak, speak } from '../../lib/speech'

const SWIPE_THRESHOLD = 80

export function Flashcard({
  word,
  onResult,
}: {
  word: WordLookupResult
  onResult: (correct: boolean) => void
}) {
  const [flipped, setFlipped] = useState(false)
  const [dragX, setDragX] = useState(0)
  const startX = useRef<number | null>(null)
  const dxRef = useRef(0)
  const moved = useRef(false)
  const answered = useRef(false)

  function answer(correct: boolean) {
    if (answered.current) return
    answered.current = true
    onResult(correct)
  }

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX
    dxRef.current = 0
    moved.current = false
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // pointer уже недоступен — жест всё равно обработается без захвата
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) > 8) moved.current = true
    dxRef.current = dx
    setDragX(dx)
  }

  function onPointerUp() {
    if (startX.current === null) return
    const dx = dxRef.current
    dxRef.current = 0
    startX.current = null
    setDragX(0)
    if (dx > SWIPE_THRESHOLD) answer(true)
    else if (dx < -SWIPE_THRESHOLD) answer(false)
    else if (!moved.current) setFlipped((f) => !f)
  }

  const tint =
    dragX > 30 ? 'border-green-400' : dragX < -30 ? 'border-red-400' : 'border-gray-200 dark:border-gray-800'

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFlipped((f) => !f)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          startX.current = null
          setDragX(0)
        }}
        style={{ transform: `translateX(${dragX}px) rotate(${dragX / 25}deg)`, touchAction: 'pan-y' }}
        className={`flex min-h-[220px] w-full max-w-sm cursor-grab select-none flex-col items-center justify-center
          gap-2 rounded-2xl border bg-white p-6 text-center shadow-sm dark:bg-gray-900 ${tint}`}
      >
        {!flipped ? (
          <div className="flex items-center gap-1">
            <p className="text-3xl font-semibold">{word.text}</p>
            {canSpeak() && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => speak(word.text, word.language)}
                aria-label="Произнести слово"
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                🔊
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-2xl font-semibold">{word.translation}</p>
            {word.meaning && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{word.meaning}</p>}
          </>
        )}
        <p className="mt-4 text-xs text-gray-400">
          Нажмите, чтобы {flipped ? 'скрыть' : 'увидеть'} перевод · свайп вправо — знаю, влево — не знаю
        </p>
      </div>

      <div className="flex w-full max-w-sm gap-3">
        <button
          type="button"
          onClick={() => answer(false)}
          className="min-h-[48px] flex-1 rounded-xl border border-red-300 font-medium text-red-600
            hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          Не знаю
        </button>
        <button
          type="button"
          onClick={() => answer(true)}
          className="min-h-[48px] flex-1 rounded-xl border border-green-300 font-medium text-green-700
            hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
        >
          Знаю
        </button>
      </div>
    </div>
  )
}
