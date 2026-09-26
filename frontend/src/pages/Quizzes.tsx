import { ComingSoon } from '../components/ComingSoon'

const modes = [
  { title: 'Вставь слово', icon: '✏️' },
  { title: 'Подбери перевод', icon: '🔤' },
  { title: 'Флеш-карты', icon: '🗂️' },
  { title: 'Сопоставление', icon: '🔗' },
  { title: 'Правописание', icon: '⌨️' },
]

export function Quizzes() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {modes.map((mode) => (
          <button
            key={mode.title}
            type="button"
            disabled
            className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border
              border-gray-200 bg-white p-3 text-sm font-medium text-gray-400 dark:border-gray-800
              dark:bg-gray-900"
          >
            <span className="text-2xl" aria-hidden="true">
              {mode.icon}
            </span>
            {mode.title}
          </button>
        ))}
      </div>
      <ComingSoon
        stage="Этап 5"
        description="Режимы квизов, прогресс и интервальное повторение (spaced repetition) появятся здесь."
      />
    </div>
  )
}
