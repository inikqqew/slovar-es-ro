const STORAGE_KEY = 'dictionary-user-id'

// crypto.randomUUID есть только в защищённом контексте (HTTPS/localhost), а приложение
// открывают и по http://<IP>:4000 в локальной сети — там нужен запасной вариант.
function generateId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Анонимный профиль (ТЗ 5.4): id генерируется в браузере и живёт в localStorage,
// backend привязывает к нему личный словарь. Позже поверх можно добавить
// email/OAuth без смены схемы — просто связать этот id с аккаунтом.
export function getUserId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = generateId()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}
