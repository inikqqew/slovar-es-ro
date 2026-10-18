// Голосовой ввод (Web Speech API). Работает в Chrome/Edge/Safari; требует HTTPS или localhost —
// по обычному http://<IP> браузер не даёт доступ к микрофону.
interface RecognitionResult {
  isFinal: boolean
  0: { transcript: string }
}
interface RecognitionEvent {
  resultIndex: number
  results: ArrayLike<RecognitionResult>
}
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type RecognitionCtor = new () => Recognition

function getCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function voiceSupported(): boolean {
  return typeof window !== 'undefined' && getCtor() !== null
}

const LANG_TAG: Record<string, string> = { es: 'es-ES', ro: 'ro-RO' }

const ERRORS: Record<string, string> = {
  'not-allowed': window.isSecureContext
    ? 'Нет доступа к микрофону — разрешите его в настройках браузера.'
    : 'Браузер не даёт микрофон на небезопасном адресе (http). Нужен HTTPS.',
  'service-not-allowed': 'Распознавание речи недоступно в этом браузере.',
  'no-speech': 'Речь не услышана — попробуйте ещё раз.',
  'audio-capture': 'Микрофон не найден.',
  network: 'Нет сети для распознавания речи.',
}

export interface VoiceSession {
  stop(): void
}

export function startVoice(
  language: string,
  handlers: { onText: (text: string, isFinal: boolean) => void; onError: (msg: string) => void; onEnd: () => void },
): VoiceSession | null {
  const Ctor = getCtor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = LANG_TAG[language] ?? language
  rec.interimResults = true
  rec.continuous = false

  rec.onresult = (e) => {
    let text = ''
    let final = false
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript
      if (e.results[i].isFinal) final = true
    }
    handlers.onText(text, final)
  }
  rec.onerror = (e) => handlers.onError(ERRORS[e.error] ?? `Ошибка распознавания речи: ${e.error}`)
  rec.onend = handlers.onEnd
  rec.start()
  return { stop: () => rec.stop() }
}
