/**
 * Native Text-To-Speech (TTS) Voice Engine for Hermes.
 * Uses Web Speech API with distinct Female and Male vocal profiles,
 * voice discovery across Windows, macOS, iOS, Android, and acoustic tuning.
 */

export type VoiceGender = 'female' | 'male' | 'auto'

export interface SpeechVoiceState {
  isSpeaking: boolean
  isPaused: boolean
  supported: boolean
}

let activeUtterance: SpeechSynthesisUtterance | null = null
let cachedVoices: SpeechSynthesisVoice[] = []

const GENDER_STORAGE_KEY = 'act.hermes.voiceGender'

// Pre-load voices and handle async voiceschanged in Chrome/Android
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    cachedVoices = window.speechSynthesis.getVoices()
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices()
    }
  } catch {}
}

export function getVoiceGender(): VoiceGender {
  try {
    const stored = localStorage.getItem(GENDER_STORAGE_KEY)
    if (stored === 'female' || stored === 'male' || stored === 'auto') {
      return stored
    }
  } catch {}
  return 'female'
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

function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  if (cachedVoices.length > 0) return cachedVoices
  try {
    cachedVoices = window.speechSynthesis.getVoices()
  } catch {}
  return cachedVoices
}

/**
 * Finds the best voice according to language and selected gender.
 */
function selectBestVoice(gender: VoiceGender): {
  voice: SpeechSynthesisVoice | null
  pitch: number
  rate: number
} {
  const voices = getAvailableVoices()

  const ptVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('pt') ||
      v.lang.toLowerCase().includes('br') ||
      v.lang.toLowerCase().includes('por'),
  )

  const voicePool = ptVoices.length > 0 ? ptVoices : voices

  // Padrões de nomes femininos (Windows, macOS, iOS, Android, Chrome)
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
    /fernanda/i,
    /camila/i,
    /female/i,
    /mulher/i,
    /feminina/i,
    /google português/i,
    /pt-br-x-afs-local/i,
  ]

  // Padrões de nomes masculinos (Windows, macOS, iOS, Android, Chrome)
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
    /jorge/i,
    /david/i,
    /male/i,
    /homem/i,
    /masculino/i,
    /pt-br-x-afm-local/i,
    /pt-br-x-yfs-local/i,
  ]

  if (gender === 'female') {
    const matchedFemale = voicePool.find((v) =>
      femalePatterns.some((pattern) => pattern.test(v.name)),
    )
    return {
      voice: matchedFemale || voicePool[0] || null,
      pitch: 1.25, // Tom feminino nítido e agudo
      rate: 1.06,  // Cadência ágil e natural
    }
  }

  if (gender === 'male') {
    const matchedMale = voicePool.find((v) =>
      malePatterns.some((pattern) => pattern.test(v.name)),
    )
    return {
      voice: matchedMale || voicePool[0] || null,
      pitch: 0.70, // Tom masculino grave e encorpado inconfundível
      rate: 0.96,  // Cadência mais firme e pausada
    }
  }

  // Automático / Padrão do sistema
  const defaultPt =
    voicePool.find(
      (v) =>
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('Maria') ||
        v.name.includes('Daniel'),
    ) || voicePool[0]

  return {
    voice: defaultPt || null,
    pitch: 1.0,
    rate: 1.02,
  }
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
    const { voice, pitch, rate } = selectBestVoice(targetGender)

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
