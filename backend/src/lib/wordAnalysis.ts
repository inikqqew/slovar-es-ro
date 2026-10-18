import { isLlmConfigured, llmComplete } from './llm.js'
import type { SupportedLanguage } from './translate.js'

export interface WordAnalysis {
  meaningRo: string
  partOfSpeech: string | null
  gender: string | null
  examples: string[]
  verified: boolean
}

const LANG_NAMES: Record<SupportedLanguage, string> = { es: 'испанского', ro: 'румынского' }

const SYSTEM = `Ты — лексикограф испанско-румынского словаря. Отвечай ТОЛЬКО одним JSON-объектом без пояснений и без markdown, формат:
{"meaning_ro": string, "part_of_speech": string|null, "gender": string|null, "examples": string[], "translation_correct": boolean}
meaning_ro — краткое толкование слова на румынском (1-2 предложения); part_of_speech — напр. "substantiv", "verb", "adjectiv"; gender — "masculin"/"feminin"/"neutru" для существительных, иначе null; examples — до 2 коротких примеров на языке исходного слова; translation_correct — true, если предложенный перевод верен.`

function extractJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

export async function analyzeWord(params: {
  text: string
  language: SupportedLanguage
  translation: string
}): Promise<WordAnalysis | null> {
  if (!isLlmConfigured()) return null
  const { text, language, translation } = params
  const target = LANG_NAMES[language === 'es' ? 'ro' : 'es']

  try {
    const reply = await llmComplete({
      system: SYSTEM,
      maxTokens: 400,
      messages: [
        {
          role: 'user',
          content: `Слово "${text}" (${LANG_NAMES[language]} язык) переведено на ${target} как "${translation}". Проверь перевод и дай разбор слова.`,
        },
      ],
    })
    const data = extractJson(reply)
    if (!data || typeof data.meaning_ro !== 'string') return null

    return {
      meaningRo: data.meaning_ro,
      partOfSpeech: typeof data.part_of_speech === 'string' ? data.part_of_speech : null,
      gender: typeof data.gender === 'string' ? data.gender : null,
      examples: Array.isArray(data.examples)
        ? data.examples.filter((e): e is string => typeof e === 'string').slice(0, 2)
        : [],
      verified: data.translation_correct === true,
    }
  } catch (err) {
    console.error('AI word analysis failed:', err)
    return null
  }
}
