import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { useOnline } from '../lib/useOnline'

export function AppShell() {
  const online = useOnline()

  return (
    <div className="flex min-h-svh flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <Header />
      {!online && (
        <div role="alert" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          Нет соединения с интернетом — для поиска, квизов и чата нужна сеть.
        </div>
      )}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
