import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchMyDictionary, type WordLookupResult } from '../lib/api'
import { fetchQuizProgress, pickDueFirst, recordQuizResult, type QuizProgress, type QuizType } from '../lib/quiz'
import { Flashcard } from '../components/quiz/Flashcard'
import { MultipleChoice } from '../components/quiz/MultipleChoice'
import { FillBlank } from '../components/quiz/FillBlank'
import { Spelling } from '../components/quiz/Spelling'
import { Matching } from '../components/quiz/Matching'

const MODE_TITLES: Record<QuizType, string> = {
  flashcard: 'Флеш-карты',
  multiple_choice: 'Подбери перевод',
  fill_blank: 'Вставь слово',
  matching: 'Сопоставление',
  spelling: 'Правописание',
}

const MODE_MIN_WORDS: Record<QuizType, number> = {
  flashcard: 1,
  multiple_choice: 2,
  fill_blank: 2,
  matching: 3,
  spelling: 1,
}

const BATCH_SIZE = 8
const MATCHING_BATCH_SIZE = 5

function isQuizType(v: string | undefined): v is QuizType {
  return !!v && v in MODE_TITLES
}

export function QuizSession() {
  const { mode } = useParams<{ mode: string }>()
  const navigate = useNavigate()

  const [pool, setPool] = useState<WordLookupResult[] | null>(null)
  const [progress, setProgress] = useState<QuizProgress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [batch, setBatch] = useState<WordLookupResult[]>([])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [round, setRound] = useState(0)

  const validMode = isQuizType(mode) ? mode : null

  useEffect(() => {
    if (!validMode) return
    setError(null)
    setPool(null)
    Promise.all([fetchMyDictionary(), fetchQuizProgress()])
      .then(([words, prog]) => {
        setPool(words)
        setProgress(prog)
      })
      .catch((err: Error) => setError(err.message))
  }, [validMode])

  useEffect(() => {
    if (!pool || !validMode) return
    const eligible = validMode === 'fill_blank' ? pool.filter((w) => w.examples.length > 0) : pool
    const size = validMode === 'matching' ? MATCHING_BATCH_SIZE : BATCH_SIZE
    setBatch(pickDueFirst(eligible, progress, validMode, size))
    setIndex(0)
    setScore({ correct: 0, total: 0 })
  }, [pool, progress, validMode, round])

  const eligibleCount = useMemo(() => {
    if (!pool || !validMode) return 0
    return validMode === 'fill_blank' ? pool.filter((w) => w.examples.length > 0).length : pool.length
  }, [pool, validMode])

  if (!validMode) {
    return (
      <div className="py-16 text-center text-gray-400">
        Неизвестный режим квиза.{' '}
        <button type="button" onClick={() => navigate('/quizzes')} className="text-blue-600 underline">
          Назад
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-red-300 p-6 text-center dark:border-red-800">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (!pool) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  if (eligibleCount < MODE_MIN_WORDS[validMode]) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {validMode === 'fill_blank'
            ? 'Нужны слова с примером употребления. Добавьте пример при ручном добавлении слова в «Мой словарь».'
            : 'Недостаточно слов в личном словаре для этого режима. Найдите и сохраните несколько слов, либо добавьте вручную.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/dictionary')}
          className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          К словарю
        </button>
      </div>
    )
  }

  if (batch.length === 0) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  const done = index >= batch.length

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-2xl font-semibold">
          {score.correct} / {score.total || batch.length}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{MODE_TITLES[validMode]} — раунд завершён</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRound((r) => r + 1)}
            className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Играть ещё
          </button>
          <button
            type="button"
            onClick={() => navigate('/quizzes')}
            className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-700"
          >
            К квизам
          </button>
        </div>
      </div>
    )
  }

  function handleSingleResult(word: WordLookupResult, correct: boolean) {
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    recordQuizResult(word.id, validMode!, correct).catch(() => {})
    setTimeout(() => setIndex((i) => i + 1), 900)
  }

  return (
    <div className="flex flex-col gap-4">
      {validMode !== 'matching' && (
        <p className="text-center text-sm text-gray-400">
          {index + 1} / {batch.length}
        </p>
      )}

      {validMode === 'flashcard' && (
        <Flashcard key={batch[index].id} word={batch[index]} onResult={(c) => handleSingleResult(batch[index], c)} />
      )}
      {validMode === 'multiple_choice' && (
        <MultipleChoice
          key={batch[index].id}
          word={batch[index]}
          pool={pool}
          onResult={(c) => handleSingleResult(batch[index], c)}
        />
      )}
      {validMode === 'fill_blank' && (
        <FillBlank
          key={batch[index].id}
          word={batch[index]}
          pool={pool}
          onResult={(c) => handleSingleResult(batch[index], c)}
        />
      )}
      {validMode === 'spelling' && (
        <Spelling key={batch[index].id} word={batch[index]} onResult={(c) => handleSingleResult(batch[index], c)} />
      )}
      {validMode === 'matching' && (
        <Matching
          words={batch}
          onPairResult={(wordId, correct) => {
            setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
            recordQuizResult(wordId, 'matching', correct).catch(() => {})
          }}
          onComplete={() => setIndex(batch.length)}
        />
      )}
    </div>
  )
}
