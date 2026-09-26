import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function HomeSearch() {
  const [term, setTerm] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = term.trim()
    if (!trimmed) return
    navigate(`/word/${encodeURIComponent(trimmed)}`)
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Реализация OCR (Tesseract.js) — Этап 3
    navigate('/word/ocr-pending', { state: { photoName: file.name } })
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="search-input" className="sr-only">
          Слово на испанском или румынском
        </label>
        <input
          id="search-input"
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Введите слово (ES/RO)…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-base
            outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
            dark:border-gray-700 dark:bg-gray-900 dark:focus:border-blue-400 dark:focus:ring-blue-900"
        />
        <button
          type="submit"
          className="h-12 min-h-[44px] w-full rounded-xl bg-blue-600 text-base font-medium text-white
            transition-colors hover:bg-blue-700 active:bg-blue-800"
        >
          Перевести
        </button>
      </form>

      <div className="flex items-center gap-3 text-sm text-gray-400">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        или
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border
          border-gray-300 bg-white py-3 text-base font-medium text-gray-700 transition-colors
          hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <span aria-hidden="true">📷</span> Сфотографировать слово
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhoto}
      />

      <p className="mt-2 text-center text-sm text-gray-400">
        Распознавание по фото (OCR) появится на Этапе 3.
      </p>
    </div>
  )
}
