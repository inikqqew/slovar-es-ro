const STORAGE_KEY = 'dictionary-user-id'

// Анонимный профиль (ТЗ 5.4): id генерируется в браузере и живёт в localStorage,
// backend привязывает к нему личный словарь. Позже поверх можно добавить
// email/OAuth без смены схемы — просто связать этот id с аккаунтом.
export function getUserId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}
