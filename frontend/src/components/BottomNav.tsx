import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/dictionary', label: 'Словарь', icon: '📖' },
  { to: '/', label: 'Поиск', icon: '🔍', end: true },
  { to: '/quizzes', label: 'Квизы', icon: '🎯' },
  { to: '/chat', label: 'Чат-бот', icon: '💬' },
  { to: '/profile', label: 'Профиль', icon: '👤' },
]

export function BottomNav() {
  return (
    <nav
      className="safe-bottom sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur
        dark:border-gray-800 dark:bg-gray-950/95"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-1">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium
                transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`
              }
            >
              <span className="text-xl leading-none" aria-hidden="true">
                {tab.icon}
              </span>
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
