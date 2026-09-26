import { useEffect, useState } from 'react'
import { fetchHealth } from '../lib/api'
import { useTheme } from '../theme/ThemeContext'

type ServerStatus = 'checking' | 'online' | 'offline'

export function Profile() {
  const { theme, toggleTheme } = useTheme()
  const [status, setStatus] = useState<ServerStatus>('checking')

  useEffect(() => {
    let cancelled = false
    fetchHealth()
      .then(() => {
        if (!cancelled) setStatus('online')
      })
      .catch(() => {
        if (!cancelled) setStatus('offline')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Настройки</h2>
        <div className="flex items-center justify-between">
          <span className="text-base">Тёмная тема</span>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            onClick={toggleTheme}
            className={`relative h-8 w-14 rounded-full transition-colors ${
              theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Статус сервера</h2>
        <div className="flex items-center gap-2 text-base">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === 'online'
                ? 'bg-green-500'
                : status === 'offline'
                  ? 'bg-red-500'
                  : 'animate-pulse bg-gray-400'
            }`}
          />
          {status === 'checking' && 'Проверка соединения…'}
          {status === 'online' && 'Backend доступен'}
          {status === 'offline' &&
            'Backend недоступен (проверьте, что сервер запущен — на бесплатном тарифе первый запрос может занимать до 50 сек)'}
        </div>
      </section>

      <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400 dark:border-gray-700">
        Статистика прогресса и аккаунт появятся на следующих этапах.
      </div>
    </div>
  )
}
