import { isLlmConfigured, llmComplete, type LlmMessage } from './llm.js'

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

export type ChatMessage = LlmMessage

export async function generateReply(language: 'es' | 'ro', history: ChatMessage[]): Promise<string> {
  if (!isLlmConfigured()) {
    return 'Чат-бот недоступен: не задан ключ LLM. Впишите LLM_API_KEY (бесплатный ключ Groq или Google Gemini) в backend/.env и перезапустите сервер.'
  }
  const reply = await llmComplete({
    system: systemPrompt(language),
    messages: history.slice(-20),
    maxTokens: 400,
  })
  return reply || '…'
}
