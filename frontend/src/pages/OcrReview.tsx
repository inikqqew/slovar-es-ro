import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { compressImage, recognizeWords, type OcrWord } from '../lib/ocr'

type Status = 'compressing' | 'recognizing' | 'done' | 'error'

export function OcrReview() {
  const location = useLocation() as { state?: { file?: File } }
  const navigate = useNavigate()
  const file = location.state?.file

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('compressing')
  const [progress, setProgress] = useState(0)
  const [words, setWords] = useState<OcrWord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return

    let cancelled = false
    let url: string | null = null

    async function run() {
      try {
        setStatus('compressing')
        const compressed = await compressImage(file!)
        if (cancelled) return
        url = URL.createObjectURL(compressed)
        setImageUrl(url)

        setStatus('recognizing')
        const found = await recognizeWords(compressed, (p) => {
          if (!cancelled) setProgress(p)
        })
        if (cancelled) return
        setWords(found)
        setStatus('done')
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось распознать текст')
          setStatus('error')
        }
      }
    }
    run()

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [file])

  if (!file) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-400">
        <p className="text-sm">Фото не выбрано.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Назад к поиску
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Загруженное фото"
          className="max-h-64 w-full rounded-xl border border-gray-200 object-contain dark:border-gray-800"
        />
      )}

      {(status === 'compressing' || status === 'recognizing') && (
        <div className="flex flex-col items-center gap-3 py-6 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <p className="text-sm">
            {status === 'compressing'
              ? 'Обрабатываем фото…'
              : `Распознаём текст… ${Math.round(progress * 100)}%`}
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-red-300 p-6 text-center dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Попробовать другое фото
          </button>
        </div>
      )}

      {status === 'done' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-400">
            {words.length > 0
              ? 'Нажмите на слово, чтобы посмотреть перевод:'
              : 'Слов не распознано — попробуйте более чёткое фото.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {words.map((w) => (
              <button
                key={w.text}
                type="button"
                onClick={() => navigate(`/word/${encodeURIComponent(w.text.toLowerCase())}`)}
                className="min-h-[44px] rounded-full border border-gray-300 bg-white px-4 py-2 text-base
                  font-medium text-gray-800 transition-colors hover:border-blue-500 hover:text-blue-600
                  dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-400"
              >
                {w.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
