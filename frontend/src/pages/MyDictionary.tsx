import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  bulkWords,
  addCustomWord,
  deleteCustomWord,
  fetchMyDictionary,
  unsaveWord,
  updateCustomWord,
  type BulkAction,
  type WordLanguage,
  type WordLookupResult,
} from '../lib/api'

const LANG_LABEL: Record<string, string> = { es: 'ES', ro: 'RO' }

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  unverified: {
    label: 'Не проверено',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  ai_verified: {
    label: 'AI',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  source_verified: {
    label: 'Словарь',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
}

type LangFilter = 'all' | WordLanguage

const EMPTY_FORM = { text: '', language: 'es' as WordLanguage, translation: '', meaning: '', example: '' }

export function MyDictionary() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WordLookupResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [langFilter, setLangFilter] = useState<LangFilter>('all')
  const [query, setQuery] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkNote, setBulkNote] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ translation: '', meaning: '', example: '' })

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchMyDictionary({ language: langFilter === 'all' ? undefined : langFilter, q: query || undefined })
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [langFilter, query])

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce поиска
    return () => clearTimeout(t)
  }, [load])

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.text.trim() || !form.translation.trim()) {
      setFormError('Введите слово и перевод')
      return
    }
    setSubmitting(true)
    try {
      await addCustomWord(form)
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось добавить слово')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setBulkNote(null)
  }

  async function runBulk(action: BulkAction, language?: WordLanguage) {
    const ids = [...selectedIds]
    if (!ids.length) return
    if (action === 'delete' && !confirm(`Удалить выбранные слова (${ids.length})?`)) return
    setBulkBusy(true)
    setBulkNote(null)
    try {
      const r = await bulkWords(ids, action, language)
      if (action === 'delete') {
        exitSelectMode()
      } else {
        setBulkNote(
          `Изменено: ${r.affected}` +
            (r.skipped > 0 ? ` · пропущено ${r.skipped} (изменять можно только свои слова / слова не найдены в DEX)` : ''),
        )
      }
      load()
    } catch (err) {
      setBulkNote(err instanceof Error ? err.message : 'Не удалось выполнить действие')
    } finally {
      setBulkBusy(false)
    }
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((w) => w.id !== id))
    try {
      await deleteCustomWord(id)
    } catch {
      load()
    }
  }

  async function handleUnsave(id: string) {
    setItems((prev) => prev.filter((w) => w.id !== id))
    try {
      await unsaveWord(id)
    } catch {
      load()
    }
  }

  function startEdit(w: WordLookupResult) {
    setEditingId(w.id)
    setEditDraft({ translation: w.translation, meaning: w.meaning, example: w.examples[0] ?? '' })
  }

  async function saveEdit(id: string) {
    try {
      const updated = await updateCustomWord(id, editDraft)
      setItems((prev) => prev.map((w) => (w.id === id ? updated : w)))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить изменения')
    }
  }

  return (
    <div className={`flex flex-col gap-4 ${selectMode ? 'pb-44' : ''}`}>
      <div className="flex gap-2">
        {(['all', 'es', 'ro'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLangFilter(l)}
            className={`min-h-[36px] rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              langFilter === l
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {l === 'all' ? 'Все' : l.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          className={`ml-auto min-h-[36px] rounded-full border px-3 py-1 text-sm font-medium ${
            selectMode
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'
          }`}
        >
          {selectMode ? 'Готово' : 'Выбрать'}
        </button>
      </div>

      <input
        type="text"
        inputMode="search"
        placeholder="Поиск по словарю…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-base outline-none
          focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900
          dark:focus:border-blue-400 dark:focus:ring-blue-900"
      />

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="min-h-[44px] w-full rounded-xl border border-dashed border-blue-400 py-2.5 text-base
            font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
        >
          + Добавить слово вручную
        </button>
      )}

      {showForm && (
        <form
          onSubmit={handleAddSubmit}
          className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Слово *"
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="h-11 flex-1 rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-950"
            />
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value as WordLanguage })}
              className="h-11 rounded-lg border border-gray-300 bg-white px-2 dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="es">ES</option>
              <option value="ro">RO</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Перевод *"
            value={form.translation}
            onChange={(e) => setForm({ ...form, translation: e.target.value })}
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-950"
          />
          <textarea
            placeholder="Значение на румынском (необязательно — подставим из словаря)"
            value={form.meaning}
            onChange={(e) => setForm({ ...form, meaning: e.target.value })}
            rows={2}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
          />
          <input
            type="text"
            placeholder="Пример употребления (опционально)"
            value={form.example}
            onChange={(e) => setForm({ ...form, example: e.target.value })}
            className="h-11 rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-950"
          />
          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] flex-1 rounded-lg bg-blue-600 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setFormError(null)
              }}
              className="min-h-[44px] flex-1 rounded-lg border border-gray-300 font-medium dark:border-gray-700"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="flex justify-center py-8 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-red-300 p-6 text-center dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={load}
            className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Повторить
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400 dark:border-gray-700">
          Пока пусто. Найдите слово на вкладке «Поиск» и нажмите «Добавить в мой словарь», либо добавьте вручную.
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((w) => {
          const badge = STATUS_BADGE[w.status] ?? STATUS_BADGE.unverified
          const isEditing = editingId === w.id
          return (
            <li
              key={w.id}
              className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
            >
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <p className="font-semibold">{w.text}</p>
                  <input
                    value={editDraft.translation}
                    onChange={(e) => setEditDraft({ ...editDraft, translation: e.target.value })}
                    placeholder="Перевод"
                    className="h-10 rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950"
                  />
                  <textarea
                    value={editDraft.meaning}
                    onChange={(e) => setEditDraft({ ...editDraft, meaning: e.target.value })}
                    placeholder="Значение (необязательно)"
                    rows={2}
                    className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                  />
                  <input
                    value={editDraft.example}
                    onChange={(e) => setEditDraft({ ...editDraft, example: e.target.value })}
                    placeholder="Пример (опционально)"
                    className="h-10 rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(w.id)}
                      className="min-h-[40px] flex-1 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="min-h-[40px] flex-1 rounded-lg border border-gray-300 text-sm font-medium dark:border-gray-700"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(w.id)}
                      onChange={() => toggleSelected(w.id)}
                      aria-label={`Выбрать ${w.text}`}
                      className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => (selectMode ? toggleSelected(w.id) : navigate(`/word/${encodeURIComponent(w.text)}`))}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {LANG_LABEL[w.language]}
                      </span>
                      <span className="font-semibold">{w.text}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{w.translation}</p>
                  </button>
                  <div className={`flex shrink-0 gap-1 ${selectMode ? 'hidden' : ''}`}>
                    {w.isCustom ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(w)}
                          aria-label="Редактировать"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(w.id)}
                          aria-label="Удалить"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          🗑️
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnsave(w.id)}
                        aria-label="Убрать из словаря"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {selectMode && (
        <div
          className="fixed inset-x-0 z-20 mx-auto max-w-2xl px-3"
          style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Выбрано: {selectedIds.size}</span>
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map((w) => w.id)))
                }
                className="min-h-[36px] px-2 text-blue-600 dark:text-blue-400"
              >
                {selectedIds.size === items.length ? 'Снять выбор' : 'Выбрать все'}
              </button>
            </div>
            {bulkNote && <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{bulkNote}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!selectedIds.size || bulkBusy}
                onClick={() => runBulk('delete')}
                className="min-h-[40px] rounded-lg bg-red-600 px-3 text-sm font-medium text-white disabled:opacity-50"
              >
                Удалить
              </button>
              <button
                type="button"
                disabled={!selectedIds.size || bulkBusy}
                onClick={() => runBulk('set_language', 'es')}
                className="min-h-[40px] rounded-lg border border-gray-300 px-3 text-sm disabled:opacity-50 dark:border-gray-700"
              >
                Язык → ES
              </button>
              <button
                type="button"
                disabled={!selectedIds.size || bulkBusy}
                onClick={() => runBulk('set_language', 'ro')}
                className="min-h-[40px] rounded-lg border border-gray-300 px-3 text-sm disabled:opacity-50 dark:border-gray-700"
              >
                Язык → RO
              </button>
              <button
                type="button"
                disabled={!selectedIds.size || bulkBusy}
                onClick={() => runBulk('refresh_meaning')}
                className="min-h-[40px] rounded-lg border border-gray-300 px-3 text-sm disabled:opacity-50 dark:border-gray-700"
              >
                Обновить значения
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
