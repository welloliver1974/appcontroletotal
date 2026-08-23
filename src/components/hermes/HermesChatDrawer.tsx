import { useState, useRef, useEffect, type FormEvent } from 'react'
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  Trash2,
  Minimize2,
} from 'lucide-react'
import {
  sendHermesChat,
  getHermesAdvancedConfig,
  loadHermesConfigFromCloud,
  type ChatMessage,
  type HermesChatResult,
} from '@/lib/hermes'
import { cn } from '@/lib/utils'
import { toast } from '@/stores/toastStore'

export function HermesChatDrawer() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'assistant',
      content: 'Olá! Sou o **Hermes**, seu copiloto de IA. Posso consultar seus dados, cadastrar itens na despensa, registrar despesas, agendar eventos ou sintetizar seu diário. Como posso te ajudar hoje?',
    },
  ])
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [recentActions, setRecentActions] = useState<HermesChatResult['actions']>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<unknown>(null)
  const config = getHermesAdvancedConfig()

  useEffect(() => {
    void loadHermesConfigFromCloud()
  }, [])

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Setup Web Speech API for voice recognition if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition

      if (SpeechRecognition) {
        // @ts-expect-error - standard browser API
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'pt-BR'

        // @ts-expect-error - standard browser event
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
          setIsListening(false)
        }

        recognition.onerror = () => {
          setIsListening(false)
          toast.warning('Não foi possível capturar o áudio.')
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }
    }
  }, [])

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast.warning('Reconhecimento de voz não suportado neste navegador.')
      return
    }

    if (isListening) {
      // @ts-expect-error - recognition stop
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        // @ts-expect-error - recognition start
        recognitionRef.current.start()
        setIsListening(true)
        toast.info('Ouvindo... pode falar! 🎙️')
      } catch {
        setIsListening(false)
      }
    }
  }

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || loading) return

    const newHistory: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newHistory)
    setInput('')
    setLoading(true)

    try {
      const result = await sendHermesChat(messages, text)
      setMessages([
        ...newHistory,
        { role: 'assistant', content: result.reply },
      ])

      if (result.actions.length > 0) {
        setRecentActions(result.actions)
        result.actions.forEach((act) => {
          toast.success(act.description)
        })
      }
    } catch {
      setMessages([
        ...newHistory,
        {
          role: 'assistant',
          content: 'Desculpe, ocorreu uma instabilidade ao me conectar com a IA. Tente novamente em instantes.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    void handleSend()
  }

  const quickPrompts = [
    'Quanto gastei este mês?',
    'Quais contas fixas vencem este mês?',
    'O que tenho para fazer hoje?',
    'O que falta comprar na despensa?',
    'Qual a previsão de revisão do carro?',
    'Quais documentos tenho salvos no cofre?',
  ]

  return (
    <>
      {/* Floating Trigger Button - positioned safely above mobile bottom navigation */}
      <div className="fixed bottom-20 right-3.5 z-30 md:bottom-6 md:right-6">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 hover:shadow-indigo-500/50 active:scale-95"
            aria-label="Abrir Copiloto Hermes"
          >
            <Bot className="h-5 w-5 transition-transform group-hover:scale-110" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border-2 border-zinc-950" />
            </span>
          </button>
        ) : null}
      </div>

      {/* Floating Chat Drawer */}
      {open && (
        <div className="fixed bottom-20 right-3 z-50 flex h-[520px] max-h-[calc(100dvh-100px)] w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900/95 shadow-2xl backdrop-blur-2xl transition-all md:bottom-6 md:right-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/70 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-xs text-zinc-100">Hermes Copilot</h3>
                  <span className="chip text-[9px] py-0 px-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    {config.provider.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono">
                  {config.llmModel.split('/').pop() || 'Hermes Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([messages[0]])}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                title="Limpar histórico"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                aria-label="Fechar"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            {messages.map((m, i) => {
              const isUser = m.role === 'user'
              return (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col max-w-[88%]',
                    isUser ? 'ml-auto items-end' : 'mr-auto items-start',
                  )}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2.5 leading-relaxed',
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 rounded-bl-sm whitespace-pre-wrap',
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="flex items-center gap-1.5 text-zinc-400 py-1">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: `${dot * 180}ms` }}
                  />
                ))}
                <span className="ml-1 text-[11px]">Hermes pensando...</span>
              </div>
            )}

            {/* Actions Feedback */}
            {recentActions.length > 0 && (
              <div className="space-y-1 pt-1">
                {recentActions.map((act, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[10px] text-emerald-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{act.description}</span>
                  </div>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          {messages.length <= 2 && (
            <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-1 no-scrollbar">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => void handleSend(p)}
                  className="shrink-0 rounded-full border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-1 text-[10px] text-zinc-300 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-zinc-100"
                >
                  <Sparkles className="inline h-2.5 w-2.5 mr-1 text-indigo-400" />
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-950/80 p-2.5"
          >
            <button
              type="button"
              onClick={toggleVoice}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100',
              )}
              title={isListening ? 'Parar gravação' : 'Falar por voz'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Ouvindo sua voz...' : 'Fale ou pergunte ao Hermes...'}
              className="flex-1 rounded-xl border border-zinc-700/60 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition-all hover:bg-indigo-400 disabled:opacity-40 disabled:hover:bg-indigo-500"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
