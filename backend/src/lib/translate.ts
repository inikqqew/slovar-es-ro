import { COMMON_RO_WORDS_NO_DIACRITICS } from './commonRoWords.js'

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
export async function detectLanguage(text: string): Promise<SupportedLanguage> {
  if (/[ăâîșțĂÂÎȘȚ]/.test(text)) return 'ro'
  if (COMMON_RO_WORDS_NO_DIACRITICS.has(text.toLowerCase())) return 'ro'
  return 'es'
}

export async function translateText(
  text: string,
  source: SupportedLanguage,
  target: SupportedLanguage,
): Promise<string> {
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
