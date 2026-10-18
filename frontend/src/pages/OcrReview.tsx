import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  fixLinesWithAi,
  preprocessImage,
  recognizePage,
  uniqueWords,
  type OcrLanguage,
  type OcrLine,
} from '../lib/ocr'
import { lookupWord, saveWord } from '../lib/api'
import { WordPanel } from '../components/WordPanel'

type Status = 'preparing' | 'recognizing' | 'done' | 'error'

interface BulkState {
  done: number
  total: number
  saved: number
  failed: number
  running: boolean
}

const LANG_OPTIONS: { value: OcrLanguage; label: string }[] = [
  { value: 'both', label: 'ES + RO' },
  { value: 'es', label: 'Испанский' },
  { value: 'ro', label: 'Румынский' },
]

const LOW_CONFIDENCE = 65

export function OcrReview() {
  const location = useLocation() as { state?: { file?: File } }
  const navigate = useNavigate()
  const file = location.state?.file

  const [rotation, setRotation] = useState(0)
  const [language, setLanguage] = useState<OcrLanguage>('both')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('preparing')
  const [progress, setProgress] = useState(0)
  const [lines, setLines] = useState<OcrLine[]>([])
  const [fixing, setFixing] = useState(false)
  const [aiFixed, setAiFixed] = useState(false)
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
        setStatus('preparing')
        setLines([])
        setAiFixed(false)
        setBulk(null)
        setSelected(null)
        const prepared = await preprocessImage(file!, rotation)
        if (cancelled) return
        url = URL.createObjectURL(prepared)
        setImageUrl(url)

        setStatus('recognizing')
        setProgress(0)
        const found = await recognizePage(prepared, language, (p) => {
          if (!cancelled) setProgress(p)
        })
        if (cancelled) return
        setLines(found)
        setStatus('done')

        if (found.length > 0) {
          setFixing(true)
          const fixed = await fixLinesWithAi(found, language)
          if (cancelled) return
          setLines(fixed.lines)
          setAiFixed(fixed.fixed)
          setFixing(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось распознать текст')
          setStatus('error')
          setFixing(false)
        }
      }
    }
    run()

    return () => {
      cancelled = true
      cancelBulk.current = true
      setFixing(false)
      if (url) URL.revokeObjectURL(url)
    }
  }, [file, rotation, language])

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
  const busy = status === 'preparing' || status === 'recognizing'
  const hasLowConfidence = lines.some((l) => l.some((t) => t.word && t.conf < LOW_CONFIDENCE))
  const confidences = lines.flatMap((l) => l.filter((t) => t.word).map((t) => t.conf))
  const avgConfidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 100
  const looksSideways = status === 'done' && !fixing && lines.length > 0 && avgConfidence < 60

  return (
    <div className={`flex flex-col gap-4 ${selected ? 'pb-48' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setRotation((r) => (r + 90) % 360)}
          disabled={busy}
          className="min-h-[40px] rounded-full border border-gray-300 px-3 text-sm font-medium disabled:opacity-50 dark:border-gray-700"
        >
          ⟳ Повернуть
        </button>
        {LANG_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setLanguage(o.value)}
            disabled={busy}
            className={`min-h-[40px] rounded-full px-3 text-sm font-medium transition-colors disabled:opacity-50 ${
              language === o.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {imageUrl && (
        <details className="rounded-xl border border-gray-200 dark:border-gray-800">
          <summary className="cursor-pointer px-4 py-3 text-sm text-gray-500">
            Как приложение видит страницу (после обработки)
          </summary>
          <img src={imageUrl} alt="Обработанное фото" className="max-h-80 w-full object-contain p-2" />
        </details>
      )}

      {busy && (
        <div className="flex flex-col items-center gap-3 py-6 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <p className="text-sm">
            {status === 'preparing'
              ? 'Улучшаем изображение…'
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
              Текст не распознан. Попробуйте повернуть страницу, выбрать язык или сфотографировать ровнее
              при хорошем освещении.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-400">
                Нажмите на слово, чтобы увидеть перевод. Слов: {total}.
                {fixing && ' Проверяем ошибки распознавания…'}
                {aiFixed && ' Ошибки распознавания исправлены ИИ.'}
                {hasLowConfidence && !fixing && ' Жёлтым подчёркнуты слова, в которых распознавание не уверено.'}
              </p>

              {looksSideways && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  Текст распознан неуверенно. Если страница снята боком или вверх ногами — нажмите «⟳ Повернуть»;
                  также можно выбрать язык страницы вместо «ES + RO».
                </div>
              )}

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
                              : `underline decoration-dotted underline-offset-4 hover:bg-blue-50 dark:hover:bg-blue-950 ${
                                  t.conf < LOW_CONFIDENCE
                                    ? 'decoration-amber-500'
                                    : 'decoration-gray-300 dark:decoration-gray-600'
                                }`
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
                    disabled={total === 0 || fixing}
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
