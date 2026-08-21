/**
 * Native Text-To-Speech (TTS) Voice Engine for Hermes.
 * Uses Web Speech API with automatic high-quality pt-BR voice selection.
 */

export interface SpeechVoiceState {
  isSpeaking: boolean
  isPaused: boolean
  supported: boolean
}

let activeUtterance: SpeechSynthesisUtterance | null = null

export function isCurrentlySpeaking(): boolean {
  return typeof window !== 'undefined' && ('speechSynthesis' in window) && (window.speechSynthesis.speaking || Boolean(activeUtterance))
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return
  try {
    window.speechSynthesis.cancel()
    activeUtterance = null
  } catch {}
}

export function pauseSpeaking(): void {
  if (!isSpeechSupported()) return
  try {
    window.speechSynthesis.pause()
  } catch {}
}

export function resumeSpeaking(): void {
  if (!isSpeechSupported()) return
  try {
    window.speechSynthesis.resume()
  } catch {}
}

export function speakText(
  text: string,
  callbacks?: {
    onStart?: () => void
    onEnd?: () => void
    onError?: (err: unknown) => void
  },
): boolean {
  if (!isSpeechSupported() || !text || !text.trim()) return false

  try {
    stopSpeaking()

    // Clean markdown symbols (asterisks, hashtags, bullets) so voice reads smoothly
    const cleanText = text
      .replace(/[*_~`#]/g, '')
      .replace(/•/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'pt-BR'
    utterance.rate = 1.05 // Natural cadence
    utterance.pitch = 1.0

    // Find best Portuguese voice
    const voices = window.speechSynthesis.getVoices()
    const ptVoices = voices.filter((v) => v.lang.startsWith('pt') || v.lang.includes('BR'))

    const preferredVoice =
      ptVoices.find((v) => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Luciana') || v.name.includes('Daniel') || v.name.includes('Maria')) ||
      ptVoices[0]

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onstart = () => {
      callbacks?.onStart?.()
    }

    utterance.onend = () => {
      activeUtterance = null
      callbacks?.onEnd?.()
    }

    utterance.onerror = (e) => {
      activeUtterance = null
      callbacks?.onError?.(e)
    }

    activeUtterance = utterance
    window.speechSynthesis.speak(utterance)
    return true
  } catch (err) {
    console.warn('[SpeechSynthesis] Error speaking text:', err)
    callbacks?.onError?.(err)
    return false
  }
}
