const LANG_TAG: Record<string, string> = { es: 'es-ES', ro: 'ro-RO' }

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text: string, language: string): void {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = LANG_TAG[language] ?? language
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}
