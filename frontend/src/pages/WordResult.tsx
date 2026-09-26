import { useParams } from 'react-router-dom'

export function WordResult() {
  const { term } = useParams<{ term: string }>()

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-400">Слово</p>
        <p className="text-2xl font-semibold">{decodeURIComponent(term ?? '')}</p>
      </div>

      <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400 dark:border-gray-700">
        Перевод и значение (на румынском), часть речи, статус верификации — появятся на Этапе 2.
      </div>

      <button
        type="button"
        disabled
        className="min-h-[44px] w-full rounded-xl border border-gray-300 bg-gray-100 py-3 text-base
          font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-800"
      >
        Добавить в мой словарь
      </button>
    </div>
  )
}
