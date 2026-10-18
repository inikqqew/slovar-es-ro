// dexonline.ro — открытый румынский толковый словарь, JSON без ключа.
// Служит и источником значения (на румынском), и внешней верификацией слова (ТЗ 4.4).
export interface DexResult {
  meaning: string
  partOfSpeech: string | null
  gender: string | null
}

const POS_MAP: Record<string, { pos: string; gender?: string }> = {
  's. m.': { pos: 'substantiv', gender: 'masculin' },
  's. f.': { pos: 'substantiv', gender: 'feminin' },
  's. n.': { pos: 'substantiv', gender: 'neutru' },
  'vb.': { pos: 'verb' },
  'adj.': { pos: 'adjectiv' },
  'adv.': { pos: 'adverb' },
  'prep.': { pos: 'prepoziție' },
  'conj.': { pos: 'conjuncție' },
  'pron.': { pos: 'pronume' },
  'num.': { pos: 'numeral' },
  'interj.': { pos: 'interjecție' },
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

export function parseDexDefinition(internalRep: string): DexResult | null {
  let text = decodeEntities(internalRep)
  // заголовок статьи: "@PISICĂ,@ $pisici,$ ..." — отбрасываем
  text = text.replace(/^\s*@[^@]*@\s*(\$[^$]*\$\s*)*/, '')

  let partOfSpeech: string | null = null
  let gender: string | null = null
  const posMatch = text.match(/^\s*#([^#]+)#/)
  if (posMatch) {
    const key = posMatch[1].trim().toLowerCase()
    const mapped = POS_MAP[key] ?? Object.entries(POS_MAP).find(([k]) => key.startsWith(k))?.[1]
    if (mapped) {
      partOfSpeech = mapped.pos
      gender = mapped.gender ?? null
    }
    text = text.slice(posMatch[0].length)
  }

  const plain = text
    .split(' * ')[0] // дальше идут идиомы/выражения
    .replace(/[@$#]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^și\s+[mfn]\.\s*/i, '') // "s. m. și f." — вторая часть рода
    .replace(/^([IVX]+\.\s*)?(\d+\.\s*)?/, '') // номера значений
    .split(/\s\*\*\s|\s\[/)[0] // доп. значения, произношение и этимология
    .trim()
  if (plain.length < 3) return null

  let meaning = plain
  if (meaning.length > 280) {
    const cut = meaning.slice(0, 280)
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '))
    meaning = (end > 80 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '')) + (end > 80 ? '' : '…')
  }
  return { meaning, partOfSpeech, gender }
}

export async function fetchDex(word: string): Promise<DexResult | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`https://dexonline.ro/definitie/${encodeURIComponent(word)}/json`, {
      headers: { 'User-Agent': 'slovar-es-ro/1.0' },
      signal: controller.signal,
    })
    if (!res.ok) return null
    const body = (await res.json()) as { definitions?: { internalRep?: string }[] }
    for (const def of body.definitions ?? []) {
      if (!def.internalRep) continue
      const parsed = parseDexDefinition(def.internalRep)
      if (parsed) return parsed
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
