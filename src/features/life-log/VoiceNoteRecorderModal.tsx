import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Mic, MicOff, RotateCcw, Sparkles, Volume2, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { sendHermesChat, transcribeAudioWithWhisper } from '@/lib/hermes'
import { toast } from '@/stores/toastStore'

interface VoiceNoteRecorderModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (draft: { title: string; body: string; mood: 1 | 2 | 3 | 4 | 5; tags: string[] }) => Promise<void>
}

// Window declaration for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition?: any
    SpeechRecognition?: any
  }
}

export function VoiceNoteRecorderModal({
  open,
  onClose,
  onSubmit,
}: VoiceNoteRecorderModalProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [structuring, setStructuring] = useState(false)
  const [saving, setSaving] = useState(false)

  const [structuredTitle, setStructuredTitle] = useState('')
  const [structuredBody, setStructuredBody] = useState('')
  const [structuredMood, setStructuredMood] = useState<1 | 2 | 3 | 4 | 5>(4)
  const [structuredTags, setStructuredTags] = useState<string[]>([])

  // References to handle recording without closures/race conditions
  const recognitionRef = useRef<any>(null)
  const isRecordingRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<any>(null)

  useEffect(() => {
    if (!open) {
      stopRecording()
      resetState()
    }
  }, [open])

  const resetState = () => {
    setIsRecording(false)
    setIsTranscribing(false)
    isRecordingRef.current = false
    finalTranscriptRef.current = ''
    audioChunksRef.current = []
    setTranscript('')
    setSeconds(0)
    setStructuring(false)
    setSaving(false)
    setStructuredTitle('')
    setStructuredBody('')
    setStructuredMood(4)
    setStructuredTags([])
  }

  const startRecording = async () => {
    resetState()
    isRecordingRef.current = true
    setIsRecording(true)

    // 1. Start Audio Stream via MediaRecorder (Captures continuous audio stream without silence timeouts)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        streamRef.current = stream

        let mimeType = 'audio/webm'
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus'
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        }

        const recorder = new MediaRecorder(stream, { mimeType })
        audioChunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data)
          }
        }

        recorder.start(250) // Collect 250ms audio slices
        mediaRecorderRef.current = recorder
      }
    } catch (micErr) {
      console.warn('[VoiceNote] MediaRecorder stream unavailable:', micErr)
    }

    // 2. Start Live Web Speech API (For live visual feedback without repeating words)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()
        recognition.lang = 'pt-BR'
        recognition.continuous = true
        recognition.interimResults = true

        recognition.onresult = (event: any) => {
          let interimText = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const item = event.results[i]
            if (item.isFinal) {
              const piece = item[0].transcript.trim()
              if (piece) {
                finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + piece
              }
            } else {
              interimText += item[0].transcript
            }
          }
          const fullText = (finalTranscriptRef.current + (interimText ? ' ' + interimText : '')).trim()
          setTranscript(fullText)
        }

        recognition.onerror = (e: any) => {
          // Ignore harmless non-speech pauses
          if (e.error !== 'no-speech' && e.error !== 'aborted') {
            console.warn('[VoiceNote] Speech recognition note:', e.error)
          }
        }

        recognition.onend = () => {
          // If the browser paused due to silence but the user is still recording, safely restart without wiping state
          if (isRecordingRef.current) {
            try {
              recognition.start()
            } catch {}
          }
        }

        recognition.start()
        recognitionRef.current = recognition
      } catch (speechErr) {
        console.warn('[VoiceNote] Speech recognition start error:', speechErr)
      }
    }

    // 3. Start Recording Timer
    setSeconds(0)
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)
  }

  const stopRecording = async () => {
    isRecordingRef.current = false
    setIsRecording(false)

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }

    // Stop MediaRecorder and process Whisper Transcription
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        setIsTranscribing(true)
        const recorder = mediaRecorderRef.current

        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve()
          recorder.stop()
        })

        // Stop all microphone tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        if (audioChunksRef.current.length > 0) {
          const mimeType = recorder.mimeType || 'audio/webm'
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })

          // Try Groq Whisper for studio-grade transcription
          const whisperText = await transcribeAudioWithWhisper(audioBlob)
          if (whisperText && whisperText.trim().length > 0) {
            finalTranscriptRef.current = whisperText.trim()
            setTranscript(whisperText.trim())
          }
        }
      } catch (err) {
        console.warn('[VoiceNote] Post-recording transcription note:', err)
      } finally {
        setIsTranscribing(false)
      }
    }
  }

  const handleStructureWithAi = async () => {
    const textToProcess = transcript.trim() || finalTranscriptRef.current.trim()
    if (!textToProcess) {
      toast.warning('Grave ou digite um texto antes de estruturar.')
      return
    }

    if (isRecording) {
      await stopRecording()
    }

    setStructuring(true)

    try {
      const prompt = `Você é o assistente de diário e reflexão pessoal do Life OS Hub.
Receba esta transcrição de áudio gravada pelo usuário e estruture em uma anotação de diário refinada.
Retorne EXCLUSIVAMENTE um objeto JSON no formato:
{
  "title": "Título conciso e representativo (máximo 6 palavras)",
  "body": "Texto pontuado, bem escrito em parágrafos claros, mantendo a autenticidade e ideias originais do usuário.",
  "mood": 1 a 5 (número inteiro: 1=péssimo/muito triste, 2=cansado/desanimado, 3=neutro/normal, 4=bom/produtivo, 5=radiante/excelente),
  "tags": ["tag1", "tag2"]
}

Transcrição do áudio:
"${textToProcess}"

Responda APENAS o JSON puro.`

      const result = await sendHermesChat([], prompt)
      const content = result.reply

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : content
      const parsed = JSON.parse(jsonStr)

      setStructuredTitle(parsed.title || 'Nota de Voz')
      setStructuredBody(parsed.body || textToProcess)
      setStructuredMood(Number(parsed.mood) >= 1 && Number(parsed.mood) <= 5 ? parsed.mood : 4)
      setStructuredTags(Array.isArray(parsed.tags) ? parsed.tags : ['voz', 'reflexao'])

      toast.success('Áudio estruturado com sucesso pelo Hermes! ✨')
    } catch (err) {
      console.error(err)
      setStructuredTitle('Nota de Voz')
      setStructuredBody(textToProcess)
      setStructuredMood(4)
      setStructuredTags(['voz'])
      toast.info('Texto pronto para salvar no diário.')
    } finally {
      setStructuring(false)
    }
  }

  const handleSave = async () => {
    const finalTitle = structuredTitle.trim() || 'Nota de Voz'
    const finalBody = structuredBody.trim() || transcript.trim()
    if (!finalBody) {
      toast.warning('Digite ou grave algo antes de salvar.')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        title: finalTitle,
        body: finalBody,
        mood: structuredMood,
        tags: structuredTags.length > 0 ? structuredTags : ['voz'],
      })
      toast.success('Anotação de voz salva no diário! 🎙️')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar relato.')
    } finally {
      setSaving(false)
    }
  }

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <Modal open={open} onClose={onClose} title="Gravar Nota de Voz com IA 🎙️" wide>
      <div className="space-y-4 pt-1">
        {/* Painel de Gravação do Áudio */}
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-2xl p-5 sm:p-6 text-center space-y-4">
          {/* Botão de Microfone Principal */}
          <div className="flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={`h-20 w-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                isRecording
                  ? 'bg-rose-500 text-white shadow-rose-500/50 animate-pulse scale-105 ring-4 ring-rose-500/30'
                  : isTranscribing
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 hover:scale-105 shadow-emerald-500/20'
              }`}
            >
              {isTranscribing ? (
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              ) : isRecording ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </button>

            <div className="space-y-1">
              <span className="font-mono text-base font-bold text-zinc-100">
                {isTranscribing
                  ? 'Refinando áudio com Whisper IA...'
                  : isRecording
                    ? `Gravando... ${formatTimer(seconds)}`
                    : 'Toque no microfone para falar'}
              </span>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {isRecording
                  ? 'Grave sem pressa. Não corta em pausas e não repete frases.'
                  : 'Fale livremente suas ideias, pensamentos ou acontecimentos do dia.'}
              </p>
            </div>
          </div>

          {/* Transcrição em Tempo Real & Edição Direta */}
          <div className="text-left space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 font-medium text-zinc-300">
                <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Transcrição Capturada:
              </span>
              {!structuredBody && transcript && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStructureWithAi}
                  disabled={structuring || isRecording || isTranscribing}
                  className="h-6 px-2 text-[11px] text-emerald-400 hover:text-emerald-300 gap-1 bg-emerald-500/10 hover:bg-emerald-500/20"
                >
                  {structuring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  <span>Estruturar com Hermes IA</span>
                </Button>
              )}
            </div>

            <textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value)
                finalTranscriptRef.current = e.target.value
              }}
              placeholder="O que você falar aparecerá aqui em tempo real... Você também pode editar o texto diretamente."
              rows={3}
              className="input-base text-xs text-zinc-100 font-sans leading-relaxed resize-y min-h-[80px]"
            />
          </div>
        </div>

        {/* Prévia Estruturada pela IA */}
        {structuredBody && (
          <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Anotação Estruturada
              </span>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>Humor:</span>
                <span className="chip px-2 py-0.5 text-xs bg-zinc-800 text-zinc-200">
                  {['😢', '😔', '😐', '😊', '🤩'][structuredMood - 1]} ({structuredMood}/5)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={structuredTitle}
                onChange={(e) => setStructuredTitle(e.target.value)}
                placeholder="Título"
                className="input-base text-sm font-bold text-zinc-100"
              />
              <textarea
                value={structuredBody}
                onChange={(e) => setStructuredBody(e.target.value)}
                rows={4}
                className="input-base text-xs leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {structuredTags.map((tag) => (
                <span key={tag} className="chip px-2 py-0.5 text-[10px] bg-zinc-800 text-zinc-300">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" /> Fechar
          </Button>

          <div className="flex items-center gap-2">
            {(transcript || structuredBody) && (
              <Button variant="ghost" size="sm" onClick={resetState} className="gap-1 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={structuredBody ? handleSave : handleStructureWithAi}
              disabled={saving || structuring || isTranscribing || (!transcript.trim() && !structuredBody)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
            >
              {structuring || saving || isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>
                {saving
                  ? 'Salvando...'
                  : structuring
                    ? 'Estruturando com IA...'
                    : isTranscribing
                      ? 'Processando áudio...'
                      : structuredBody
                        ? 'Salvar no Diário'
                        : 'Estruturar & Salvar'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
