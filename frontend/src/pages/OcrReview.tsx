import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { compressImage, recognizePage, uniqueWords, type OcrLine } from '../lib/ocr'
import { lookupWord, saveWord } from '../lib/api'
import { WordPanel } from '../components/WordPanel'

type Status = 'compressing' | 'recognizing' | 'done' | 'error'

interface BulkState {
  done: number
  total: number
  saved: number
  failed: number
  running: boolean
}

export function OcrReview() {
  const location = useLocation() as { state?: { file?: File } }
  const navigate = useNavigate()
  const file = location.state?.file

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('compressing')
  const [progress, setProgress] = useState(0)
  const [lines, setLines] = useState<OcrLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [bulk, setBulk] = useState<BulkState | null>(null)
  const cancelBulk = useRef(false)

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
        const found = await recognizePage(compressed, (p) => {
          if (!cancelled) setProgress(p)
        })
        if (cancelled) return
        setLines(found)
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
      cancelBulk.current = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [file])

  async function saveAll() {
    const words = uniqueWords(lines)
    if (!words.length) return
    cancelBulk.current = false
    const state: BulkState = { done: 0, total: words.length, saved: 0, failed: 0, running: true }
    setBulk({ ...state })

    const queue = [...words]
    async function worker() {
      while (queue.length && !cancelBulk.current) {
        const w = queue.shift()!
        try {
          const found = await lookupWord(w)
          if (!found.savedByMe) await saveWord(found.id)
          state.saved++
        } catch {
          state.failed++
        }
        state.done++
        setBulk({ ...state })
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setBulk({ ...state, running: false })
  }

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

  const total = uniqueWords(lines).length

  return (
    <div className={`flex flex-col gap-4 ${selected ? 'pb-48' : ''}`}>
      {imageUrl && (
        <details className="rounded-xl border border-gray-200 dark:border-gray-800">
          <summary className="cursor-pointer px-4 py-3 text-sm text-gray-500">Показать фото</summary>
          <img src={imageUrl} alt="Загруженное фото" className="max-h-80 w-full object-contain p-2" />
        </details>
      )}

      {(status === 'compressing' || status === 'recognizing') && (
        <div className="flex flex-col items-center gap-3 py-6 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <p className="text-sm">
            {status === 'compressing'
              ? 'Обрабатываем фото…'
              : `Распознаём страницу… ${Math.round(progress * 100)}%`}
          </p>
          {status === 'recognizing' && (
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
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
        <>
          {lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Текст не распознан — сфотографируйте страницу ровнее и при хорошем освещении.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-400">
                Нажмите на любое слово на странице, чтобы увидеть перевод. Слов: {total}.
              </p>

              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                {lines.map((line, i) => (
                  <p key={i} className="flex flex-wrap gap-x-1.5 text-base leading-9">
                    {line.map((t, j) =>
                      t.word ? (
                        <button
                          key={j}
                          type="button"
                          onClick={() => setSelected(t.word)}
                          className={`rounded px-0.5 text-left transition-colors ${
                            selected?.toLowerCase() === t.word.toLowerCase()
                              ? 'bg-blue-600 text-white'
                              : 'underline decoration-gray-300 decoration-dotted underline-offset-4 hover:bg-blue-50 dark:decoration-gray-600 dark:hover:bg-blue-950'
                          }`}
                        >
                          {t.raw}
                        </button>
                      ) : (
                        <span key={j} className="text-gray-400">
                          {t.raw}
                        </span>
                      ),
                    )}
                  </p>
                ))}
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                {!bulk && (
                  <button
                    type="button"
                    onClick={saveAll}
                    disabled={total === 0}
                    className="min-h-[48px] rounded-xl bg-blue-600 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Сохранить все слова страницы в словарь ({total})
                  </button>
                )}
                {bulk && (
                  <>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(bulk.done / bulk.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {bulk.running ? 'Переводим и сохраняем… ' : 'Готово. '}
                      {bulk.done}/{bulk.total} · сохранено {bulk.saved}
                      {bulk.failed > 0 && ` · не удалось ${bulk.failed}`}
                    </p>
                    {bulk.running ? (
                      <button
                        type="button"
                        onClick={() => (cancelBulk.current = true)}
                        className="min-h-[44px] rounded-xl border border-gray-300 text-sm font-medium dark:border-gray-700"
                      >
                        Остановить
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/dictionary')}
                        className="min-h-[44px] rounded-xl bg-blue-600 text-sm font-medium text-white"
                      >
                        Открыть мой словарь
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}

      {selected && <WordPanel term={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
