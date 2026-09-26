import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
