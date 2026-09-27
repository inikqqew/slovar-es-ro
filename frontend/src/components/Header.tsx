import { useLocation } from 'react-router-dom'
import { useTheme } from '../theme/ThemeContext'

const TITLES: Record<string, string> = {
  '/': 'Поиск слова',
  '/dictionary': 'Мой словарь',
  '/quizzes': 'Квизы',
  '/chat': 'Чат-бот',
  '/profile': 'Профиль',
  '/ocr': 'Фото слова',
}

function titleForPath(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/word/')) return 'Результат'
  return 'Словарь'
}

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  return (
    <header className="safe-top sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {titleForPath(location.pathname)}
        </h1>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl transition-colors
            hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
