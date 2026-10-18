import { COMMON_RO_WORDS_NO_DIACRITICS } from './commonRoWords.js'
import { isLlmConfigured, llmComplete } from './llm.js'

// MyMemory Translation API — бесплатно, без регистрации/ключа (лимит ~5000 симв./день с IP).
// LibreTranslate (см. .env.example) остаётся опцией для self-host/платного ключа в будущем —
// достаточно переключить реализацию translateText ниже.
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get'
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL // опционально: поднимает лимит до 50000 симв./день

const SUPPORTED = ['es', 'ro'] as const
export type SupportedLanguage = (typeof SUPPORTED)[number]

export function otherLanguage(lang: SupportedLanguage): SupportedLanguage {
  return lang === 'es' ? 'ro' : 'es'
}

// MyMemory не умеет определять язык, а статистические детекторы (франц. триграммы и
// т.п.) ненадёжны на одном коротком слове без контекста — проверено эмпирически.
// Поэтому: (1) диакритики ă â î ș ț — надёжный сигнал в пользу румынского;
// (2) иначе — сверка со списком частых румынских слов без диакритиков;
// (3) иначе — испанский по умолчанию (более крупный язык в паре и чаще вводится "как есть").
const detectCache = new Map<string, SupportedLanguage>()

export async function detectLanguage(text: string): Promise<SupportedLanguage> {
  if (/[ăâîșțĂÂÎȘȚ]/.test(text)) return 'ro'
  if (/[ñ¿¡áéíóú]/i.test(text)) return 'es'
  const key = text.toLowerCase()
  if (COMMON_RO_WORDS_NO_DIACRITICS.has(key)) return 'ro'

  // Неоднозначные слова без диакритиков — спрашиваем LLM (если настроен), результат кэшируем
  if (isLlmConfigured()) {
    const cached = detectCache.get(key)
    if (cached) return cached
    try {
      const reply = await llmComplete({
        system:
          'Определи, к какому языку относится слово: испанский (es) или румынский (ro; возможно, написан без диакритиков). Ответь одним словом: es или ro.',
        messages: [{ role: 'user', content: text }],
        maxTokens: 50,
      })
      const m = reply.toLowerCase().match(/\b(es|ro)\b/)
      if (m) {
        detectCache.set(key, m[1] as SupportedLanguage)
        return m[1] as SupportedLanguage
      }
    } catch {
      // LLM недоступен — падаем на значение по умолчанию
    }
  }
  return 'es'
}

const LANG_NAME_EN: Record<SupportedLanguage, string> = { es: 'Spanish', ro: 'Romanian' }

export async function translateText(
  text: string,
  source: SupportedLanguage,
  target: SupportedLanguage,
): Promise<string> {
  // LLM переводит слова точнее MyMemory (особенно глаголы) и не упирается в дневной лимит
  if (isLlmConfigured()) {
    try {
      const reply = await llmComplete({
        system: `You are a bilingual ${LANG_NAME_EN[source]}-${LANG_NAME_EN[target]} dictionary. Translate the given ${LANG_NAME_EN[source]} word into ${LANG_NAME_EN[target]}: give the most common dictionary form (infinitive for verbs, singular for nouns), lowercase. If there are 2-3 clearly distinct common meanings, separate them with a comma. Reply with the translation only, no explanations.`,
        messages: [{ role: 'user', content: text }],
        maxTokens: 60,
      })
      const cleaned = reply.split('\n')[0].replace(/^["'«»]+|["'«».]+$/g, '').trim()
      if (cleaned) return cleaned
    } catch {
      // LLM недоступен или упёрся в лимит — используем MyMemory ниже
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const params = new URLSearchParams({
      q: text,
      langpair: `${source}|${target}`,
    })
    if (MYMEMORY_EMAIL) params.set('de', MYMEMORY_EMAIL)

    const res = await fetch(`${MYMEMORY_URL}?${params.toString()}`, { signal: controller.signal })
    if (!res.ok) throw new Error(`MyMemory translate failed: ${res.status}`)

    const body = (await res.json()) as {
      responseStatus: number | string
      responseData: { translatedText: string }
      responseDetails?: string
    }
    if (Number(body.responseStatus) !== 200) {
      throw new Error(`MyMemory translate error: ${body.responseDetails ?? body.responseStatus}`)
    }
    return body.responseData.translatedText
  } finally {
    clearTimeout(timeout)
  }
}
