import { useEffect, useRef, useState } from 'react'
import { fetchChatSession, sendChatMessage, type ChatLanguage, type ChatMessage } from '../lib/chat'

const LANG_LABEL: Record<ChatLanguage, string> = { es: 'Испанский', ro: 'Румынский' }

export function Chat() {
  const [language, setLanguage] = useState<ChatLanguage>('es')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    setSendError(null)
    fetchChatSession(language)
      .then((s) => {
        setSessionId(s.id)
        setMessages(s.messages)
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [language])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || !sessionId || sending) return

    setSending(true)
    setSendError(null)
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')

    try {
      const { messages: updated } = await sendChatMessage(sessionId, text)
      setMessages(updated)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2">
        {(['es', 'ro'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLanguage(l)}
            className={`min-h-[36px] rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              language === l
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      )}

      {!loading && loadError && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-red-300 p-6 text-center dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        </div>
      )}

      {!loading && !loadError && (
        <>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {messages.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">
                Напишите первое сообщение, чтобы начать практиковать {LANG_LABEL[language].toLowerCase()}.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-base ${
                  m.role === 'user'
                    ? 'self-end bg-blue-600 text-white'
                    : 'self-start bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="self-start rounded-2xl bg-gray-100 px-4 py-2 text-base text-gray-400 dark:bg-gray-800">
                …
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {sendError && <p className="text-sm text-red-600 dark:text-red-400">{sendError}</p>}

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              inputMode="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              placeholder="Введите сообщение…"
              className="h-12 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-base outline-none
                focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-70
                dark:border-gray-700 dark:bg-gray-900 dark:focus:border-blue-400 dark:focus:ring-blue-900"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="min-h-[44px] rounded-xl bg-blue-600 px-5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              →
            </button>
          </form>
        </>
      )}
    </div>
  )
}
