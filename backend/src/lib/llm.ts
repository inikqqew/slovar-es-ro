import Anthropic from '@anthropic-ai/sdk'

// Универсальный клиент LLM. Приоритет:
//  1) LLM_API_KEY — любой OpenAI-совместимый сервис (Groq, Google Gemini, OpenRouter, Mistral…)
//  2) ANTHROPIC_API_KEY — Claude
// Без ключей AI-функции мягко отключаются (см. isLlmConfigured).
export interface LlmMessage {
  role: 'user' | 'assistant'
  content: string
}

const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1'
const DEFAULT_MODEL = 'openai/gpt-oss-120b'

export function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY)
}

export async function llmComplete(params: {
  system: string
  messages: LlmMessage[]
  maxTokens?: number
}): Promise<string> {
  const { system, messages, maxTokens = 500 } = params

  if (process.env.LLM_API_KEY) {
    const base = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
    const model = process.env.LLM_MODEL || DEFAULT_MODEL
    const reasoning = model.includes('gpt-oss')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    try {
      const doFetch = () => fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          // у reasoning-моделей (gpt-oss) «размышления» тоже считаются в лимит токенов
          max_tokens: reasoning ? maxTokens * 4 : maxTokens,
          temperature: 0.4,
          ...(reasoning ? { reasoning_effort: 'low' } : {}),
          messages: [{ role: 'system', content: system }, ...messages],
        }),
        signal: controller.signal,
      })
      let res = await doFetch()
      // бесплатные тарифы ограничивают число запросов в минуту — один повтор с паузой
      if (res.status === 429) {
        const wait = Math.min(Number(res.headers.get('retry-after')) || 3, 8)
        await new Promise((r) => setTimeout(r, wait * 1000))
        res = await doFetch()
      }
      if (!res.ok) {
        throw new Error(`LLM ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
      }
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      return body.choices?.[0]?.message?.content?.trim() ?? ''
    } finally {
      clearTimeout(timeout)
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages,
    })
    const block = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    return block?.text.trim() ?? ''
  }

  throw new Error('LLM не настроен')
}
