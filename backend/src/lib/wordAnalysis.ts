import Anthropic from '@anthropic-ai/sdk'
import type { SupportedLanguage } from './translate.js'

export interface WordAnalysis {
  meaningRo: string
  partOfSpeech: string | null
  gender: string | null
  examples: string[]
  verified: boolean
}

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null

const LANG_NAMES: Record<SupportedLanguage, string> = { es: 'испанского', ro: 'румынского' }

const ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'submit_word_analysis',
  description: 'Отправить разбор слова словаря ES/RO',
  input_schema: {
    type: 'object',
    properties: {
      meaning_ro: {
        type: 'string',
        description: 'Толкование (значение) слова на румынском языке, 1-2 предложения',
      },
      part_of_speech: {
        type: ['string', 'null'],
        description: 'Часть речи, напр. substantiv, verb, adjectiv',
      },
      gender: {
        type: ['string', 'null'],
        description: 'Род для существительных (masculin/feminin/neutru), иначе null',
      },
      examples: {
        type: 'array',
        items: { type: 'string' },
        description: 'До 2 примеров употребления слова в оригинальном языке',
      },
      translation_correct: {
        type: 'boolean',
        description: 'true, если предложенный перевод на второй язык верен',
      },
    },
    required: ['meaning_ro', 'part_of_speech', 'gender', 'examples', 'translation_correct'],
  },
}

export async function analyzeWord(params: {
  text: string
  language: SupportedLanguage
  translation: string
}): Promise<WordAnalysis | null> {
  if (!client) return null

  const { text, language, translation } = params
  const targetLangName = LANG_NAMES[language === 'es' ? 'ro' : 'es']

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: 'submit_word_analysis' },
      messages: [
        {
          role: 'user',
          content: `Слово "${text}" (${LANG_NAMES[language]} язык) переведено на ${targetLangName} как "${translation}". Проверь корректность перевода и дай толкование слова "${text}" на румынском языке, а также часть речи, род (если применимо) и до двух примеров употребления.`,
        },
      ],
    })

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    )
    if (!toolUse) return null

    const input = toolUse.input as {
      meaning_ro: string
      part_of_speech: string | null
      gender: string | null
      examples: string[]
      translation_correct: boolean
    }

    return {
      meaningRo: input.meaning_ro,
      partOfSpeech: input.part_of_speech,
      gender: input.gender,
      examples: input.examples ?? [],
      verified: input.translation_correct,
    }
  } catch (err) {
    console.error('AI word analysis failed:', err)
    return null
  }
}
