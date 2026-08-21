/**
 * Native Text-To-Speech (TTS) Voice Engine for Hermes.
 * Uses Web Speech API with automatic and selectable Voice Gender (Feminina / Masculina / Automática).
 */

export type VoiceGender = 'female' | 'male' | 'auto'

export interface SpeechVoiceState {
  isSpeaking: boolean
  isPaused: boolean
  supported: boolean
}

let activeUtterance: SpeechSynthesisUtterance | null = null

const GENDER_STORAGE_KEY = 'act.hermes.voiceGender'

export function getVoiceGender(): VoiceGender {
  try {
    const stored = localStorage.getItem(GENDER_STORAGE_KEY)
    if (stored === 'female' || stored === 'male' || stored === 'auto') {
      return stored
    }
  } catch {}
  return 'female' // Padrão feminina (tom de assistente executiva claro)
}

export function setVoiceGender(gender: VoiceGender): void {
  try {
    localStorage.setItem(GENDER_STORAGE_KEY, gender)
  } catch {}
}

export function isCurrentlySpeaking(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    (window.speechSynthesis.speaking || Boolean(activeUtterance))
  )
}

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  )
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

/**
 * Finds the best voice according to language and selected gender.
 */
function selectBestVoice(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender,
): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } {
  const ptVoices = voices.filter(
    (v) => v.lang.toLowerCase().startsWith('pt') || v.lang.toLowerCase().includes('br'),
  )

  const voicePool = ptVoices.length > 0 ? ptVoices : voices

  if (voicePool.length === 0) {
    return {
      voice: null,
      pitch: gender === 'female' ? 1.15 : gender === 'male' ? 0.85 : 1.0,
      rate: 1.05,
    }
  }

  // Padrões de nomes femininos
  const femalePatterns = [
    /maria/i,
    /luciana/i,
    /francisca/i,
    /helena/i,
    /leticia/i,
    /letícia/i,
    /yara/i,
    /joana/i,
    /raquel/i,
    /female/i,
    /mulher/i,
    /feminina/i,
    /google português/i,
  ]

  // Padrões de nomes masculinos
  const malePatterns = [
    /daniel/i,
    /felipe/i,
    /antonio/i,
    /antônio/i,
    /ricardo/i,
    /cristiano/i,
    /thiago/i,
    /tiago/i,
    /duarte/i,
    /male/i,
    /homem/i,
    /masculino/i,
  ]

  if (gender === 'female') {
    const matchedFemale = voicePool.find((v) =>
      femalePatterns.some((pattern) => pattern.test(v.name)),
    )
    if (matchedFemale) {
      return { voice: matchedFemale, pitch: 1.05, rate: 1.05 }
    }
    // Fallback: usa primeira voz disponível com tom mais agudo
    return { voice: voicePool[0], pitch: 1.18, rate: 1.05 }
  }

  if (gender === 'male') {
    const matchedMale = voicePool.find((v) =>
      malePatterns.some((pattern) => pattern.test(v.name)),
    )
    if (matchedMale) {
      return { voice: matchedMale, pitch: 0.95, rate: 1.02 }
    }
    // Fallback: usa primeira voz disponível com tom mais encorpado/grave
    return { voice: voicePool[0], pitch: 0.82, rate: 1.02 }
  }

  // Automático
  const defaultPt =
    voicePool.find(
      (v) =>
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('Maria') ||
        v.name.includes('Daniel'),
    ) || voicePool[0]

  return { voice: defaultPt, pitch: 1.0, rate: 1.05 }
}

export function speakText(
  text: string,
  callbacks?: {
    gender?: VoiceGender
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

    const targetGender = callbacks?.gender || getVoiceGender()
    const voices = window.speechSynthesis.getVoices()
    const { voice, pitch, rate } = selectBestVoice(voices, targetGender)

    if (voice) {
      utterance.voice = voice
    }
    utterance.pitch = pitch
    utterance.rate = rate

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
