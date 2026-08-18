import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Mic, MicOff, RotateCcw, Sparkles, Volume2, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { sendHermesChat } from '@/lib/hermes'
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
  const [transcript, setTranscript] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [structuring, setStructuring] = useState(false)
  const [saving, setSaving] = useState(false)

  const [structuredTitle, setStructuredTitle] = useState('')
  const [structuredBody, setStructuredBody] = useState('')
  const [structuredMood, setStructuredMood] = useState<1 | 2 | 3 | 4 | 5>(4)
  const [structuredTags, setStructuredTags] = useState<string[]>([])

  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<any>(null)

  useEffect(() => {
    if (!open) {
      stopRecording()
      resetState()
    }
  }, [open])

  const resetState = () => {
    setIsRecording(false)
    setTranscript('')
    setSeconds(0)
    setStructuring(false)
    setSaving(false)
    setStructuredTitle('')
    setStructuredBody('')
    setStructuredMood(4)
    setStructuredTags([])
  }

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Navegador não suporta reconhecimento de voz direto. Use o Chrome ou Edge.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'pt-BR'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: any) => {
        let text = ''
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript + ' '
        }
        setTranscript(text.trim())
      }

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e)
        if (e.error !== 'no-speech') {
          toast.error('Erro na captura de áudio.')
        }
      }

      recognition.onend = () => {
        if (isRecording) {
          try {
            recognition.start()
          } catch {}
        }
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsRecording(true)

      setSeconds(0)
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    } catch (err) {
      console.error(err)
      toast.error('Não foi possível acessar o microfone.')
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRecording(false)
  }

  const handleStructureWithAi = async () => {
    if (!transcript.trim()) return
    stopRecording()
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
"${transcript.trim()}"

Responda APENAS o JSON puro.`

      const result = await sendHermesChat([], prompt)
      const content = result.reply

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : content
      const parsed = JSON.parse(jsonStr)

      setStructuredTitle(parsed.title || 'Nota de Voz')
      setStructuredBody(parsed.body || transcript.trim())
      setStructuredMood(Number(parsed.mood) >= 1 && Number(parsed.mood) <= 5 ? parsed.mood : 4)
      setStructuredTags(Array.isArray(parsed.tags) ? parsed.tags : ['voz', 'reflexao'])

      toast.success('Áudio estruturado com sucesso pelo Hermes! ✨')
    } catch (err) {
      console.error(err)
      setStructuredTitle('Nota de Voz')
      setStructuredBody(transcript.trim())
      setStructuredMood(4)
      setStructuredTags(['voz'])
      toast.info('Texto transcrito pronto para salvar.')
    } finally {
      setStructuring(false)
    }
  }

  const handleSave = async () => {
    const finalTitle = structuredTitle.trim() || 'Nota de Voz'
    const finalBody = structuredBody.trim() || transcript.trim()
    if (!finalBody) return

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
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-2xl p-6 text-center space-y-4">
          {/* Botão de Microfone Pulsante */}
          <div className="flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`h-20 w-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                isRecording
                  ? 'bg-rose-500 text-white shadow-rose-500/50 animate-pulse scale-105'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 hover:scale-105 shadow-emerald-500/20'
              }`}
            >
              {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </button>

            <div className="space-y-1">
              <span className="font-mono text-base font-bold text-zinc-100">
                {isRecording ? `Gravando... ${formatTimer(seconds)}` : 'Clique para começar a falar'}
              </span>
              <p className="text-xs text-zinc-400">
                {isRecording
                  ? 'Fale livremente sobre o seu dia, ideias ou reflexões...'
                  : 'O Hermes transcreverá e estruturará sua anotação automaticamente.'}
              </p>
            </div>
          </div>

          {/* Transcrição em Tempo Real */}
          {transcript && (
            <div className="text-left space-y-1.5 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Transcrição Capturada:
                </span>
                {!structuredBody && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStructureWithAi}
                    disabled={structuring || isRecording}
                    className="h-6 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 gap-1"
                  >
                    {structuring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    <span>Estruturar com Hermes IA</span>
                  </Button>
                )}
              </div>
              <p className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 font-sans leading-relaxed max-h-32 overflow-y-auto">
                {transcript}
              </p>
            </div>
          )}
        </div>

        {/* Prévia Estruturada */}
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
            <X className="h-4 w-4" /> Cancelar
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
              disabled={saving || structuring || (!transcript && !structuredBody)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
            >
              {structuring || saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>
                {saving
                  ? 'Salvando...'
                  : structuring
                    ? 'Estruturando...'
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
