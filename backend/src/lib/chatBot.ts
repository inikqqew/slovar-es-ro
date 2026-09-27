import Anthropic from '@anthropic-ai/sdk'

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null

const LANG_NAMES: Record<'es' | 'ro', string> = { es: 'испанском', ro: 'румынском' }

function systemPrompt(language: 'es' | 'ro'): string {
  const name = LANG_NAMES[language]
  return `Ты — дружелюбный собеседник для практики разговорного ${name} языка. Правила:
- Общайся ТОЛЬКО на ${name} языке, независимо от того, на каком языке пишет пользователь.
- Обсуждай бытовые темы: путешествия, покупки, еда, повседневная жизнь — поддерживай простой, живой диалог.
- Если пользователь допускает ошибку (грамматика, слово), мягко поправь: сначала короткий естественный ответ по теме, затем отдельной строкой в скобках краткое исправление на русском, например: (Исправление: правильно "casa", а не "caza").
- Если пользователь просит объяснить слово или грамматику — объясняй кратко и по-русски, затем возвращайся к диалогу на ${name}.
- Пиши коротко (2-4 предложения), это переписка, а не лекция.`
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function generateReply(
  language: 'es' | 'ro',
  history: ChatMessage[],
): Promise<string> {
  if (!client) {
    return 'Чат-бот недоступен: не настроен ANTHROPIC_API_KEY на сервере. Добавьте ключ в backend/.env, чтобы включить эту функцию.'
  }

  const recentHistory = history.slice(-20)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: systemPrompt(language),
    messages: recentHistory.map((m) => ({ role: m.role, content: m.content })),
  })

  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  return textBlock?.text ?? '…'
}
