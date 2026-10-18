import { useEffect, useState } from 'react'
import { createTransferCode, redeemTransferCode } from '../lib/api'
import { setUserId } from '../lib/userId'

export function TransferProfile() {
  const [code, setCode] = useState<{ code: string; expiresAt: number } | null>(null)
  const [left, setLeft] = useState(0)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    const tick = () => {
      const s = Math.max(0, Math.round((code.expiresAt - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) setCode(null)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [code])

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      const r = await createTransferCode()
      setCode({ code: r.code, expiresAt: new Date(r.expiresAt).getTime() })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось получить код')
    } finally {
      setBusy(false)
    }
  }

  async function redeem(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    if (!confirm('Это устройство подключится к профилю с кодом. Слова, добавленные здесь, объединятся с ним. Продолжить?')) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { userId } = await redeemTransferCode(input)
      setUserId(userId)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подключиться')
      setBusy(false)
    }
  }

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Словарь, прогресс и чаты привязаны к браузеру. Чтобы открыть их на другом устройстве, получите код здесь и
        введите его там.
      </p>

      <div className="flex flex-col gap-2">
        {code ? (
          <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-950">
            <p className="font-mono text-3xl font-semibold tracking-widest">{code.code}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Действует {mm}:{ss} · одноразовый — введите его на другом устройстве
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="min-h-[44px] rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50 dark:border-gray-700"
          >
            Получить код для другого устройства
          </button>
        )}
      </div>

      <form onSubmit={redeem} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Код с другого устройства"
          autoCapitalize="characters"
          autoCorrect="off"
          maxLength={9}
          className="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 font-mono tracking-wider
            dark:border-gray-700 dark:bg-gray-950"
        />
        <button
          type="submit"
          disabled={busy || input.replace(/[^A-Z0-9]/gi, '').length < 8}
          className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          Подключить
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
