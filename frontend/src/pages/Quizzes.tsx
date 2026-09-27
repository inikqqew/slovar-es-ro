import { useNavigate } from 'react-router-dom'
import type { QuizType } from '../lib/quiz'

const modes: { type: QuizType; title: string; icon: string }[] = [
  { type: 'fill_blank', title: 'Вставь слово', icon: '✏️' },
  { type: 'multiple_choice', title: 'Подбери перевод', icon: '🔤' },
  { type: 'flashcard', title: 'Флеш-карты', icon: '🗂️' },
  { type: 'matching', title: 'Сопоставление', icon: '🔗' },
  { type: 'spelling', title: 'Правописание', icon: '⌨️' },
]

export function Quizzes() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {modes.map((mode) => (
          <button
            key={mode.type}
            type="button"
            onClick={() => navigate(`/quizzes/${mode.type}`)}
            className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border
              border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 transition-colors
              hover:border-blue-400 hover:text-blue-600 dark:border-gray-800 dark:bg-gray-900
              dark:text-gray-200 dark:hover:border-blue-500"
          >
            <span className="text-2xl" aria-hidden="true">
              {mode.icon}
            </span>
            {mode.title}
          </button>
        ))}
      </div>
    </div>
  )
}
