import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, RotateCcw, X, MessageSquare, Sparkles } from 'lucide-react'
import type { RoleplaySession, RoleplayMessage } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { api } from '@/data/api'

// Mock Hermes responses for different scenarios
const HERMES_RESPONSES: Record<string, Array<{ trigger: string[]; response: string; meta?: RoleplayMessage['meta'] }>> = {
  'airport check-in': [
    { trigger: ['passport', 'booking', 'reference'], response: 'Thank you. I see you\'re flying to London Heathrow, departing at 14:30. Would you like an aisle or window seat?', meta: { tone: 'neutral' } },
    { trigger: ['aisle', 'corridor'], response: 'Aisle seat it is. Row 12, seat C. Here\'s your boarding pass. Your gate is B4 — boarding starts at 13:50. Have a pleasant flight!', meta: { tone: 'encouraging' } },
    { trigger: ['window'], response: 'Window seat confirmed. Row 12, seat A. Here\'s your boarding pass. Gate B4, boarding at 13:50. Enjoy the view!', meta: { tone: 'encouraging' } },
    { trigger: ['baggage', 'bag', 'luggage'], response: 'You have one checked bag included. Please proceed to baggage drop at counter 3. It closes at 13:30.', meta: { tone: 'neutral' } },
    { trigger: [], response: 'I understand. Is there anything else I can help you with regarding your check-in?', meta: { tone: 'neutral' } },
  ],
  'job interview': [
    { trigger: ['background', 'experience', 'developer', 'react', 'typescript'], response: 'Great! That sounds like valuable experience. What would you say is your greatest professional achievement so far?', meta: { tone: 'neutral' } },
    { trigger: ['achievement', 'proud', 'led', 'migration', 'design system'], response: 'Impressive! Leading a design system migration shows both technical and leadership skills. How do you handle tight deadlines with competing priorities?', meta: { tone: 'encouraging' } },
    { trigger: ['deadline', 'priority', 'prioritize', 'communicate'], response: 'Good approach — communication is key. One more question: why are you interested in this role specifically?', meta: { tone: 'neutral' } },
    { trigger: ['interest', 'company', 'culture', 'growth', 'values'], response: 'Thank you for sharing that. Do you have any questions for us about the team or the projects you\'d be working on?', meta: { tone: 'encouraging' } },
    { trigger: [], response: 'That\'s a good point. Could you elaborate a bit more on that?', meta: { tone: 'neutral' } },
  ],
  'ordering food': [
    { trigger: ['menu', 'recommend', 'suggest'], response: 'Our chef\'s special today is grilled salmon with quinoa salad. We also have an excellent vegetarian pasta. Any dietary restrictions?', meta: { tone: 'encouraging' } },
    { trigger: ['salmon', 'fish'], response: 'Excellent choice! Would you like that with a side of roasted vegetables or sweet potato fries?', meta: { tone: 'neutral' } },
    { trigger: ['pasta', 'vegetarian', 'vegan'], response: 'The vegetarian pasta is our house-made tagliatelle with roasted tomato sauce and basil. Would you like parmesan on top?', meta: { tone: 'neutral' } },
    { trigger: ['drink', 'wine', 'water', 'coffee'], response: 'We have a nice selection of wines, or I can bring you sparkling water and coffee after your meal.', meta: { tone: 'neutral' } },
    { trigger: [], response: 'Absolutely. Would you like to start with an appetizer, or shall I give you a few more minutes?', meta: { tone: 'neutral' } },
  ],
  'hotel check-in': [
    { trigger: ['reservation', 'booking', 'name'], response: 'Welcome! I found your reservation for a deluxe king room, 3 nights. Could I see your ID and credit card for incidentals?', meta: { tone: 'neutral' } },
    { trigger: ['wifi', 'password', 'internet'], response: 'The WiFi network is "GrandHotel_Guest" and the password is "welcome2024". It\'s complimentary for all guests.', meta: { tone: 'encouraging' } },
    { trigger: ['breakfast', 'morning', 'food'], response: 'Breakfast is served from 6:30 to 10:30 on the 2nd floor. Your room key gives you access.', meta: { tone: 'neutral' } },
    { trigger: ['gym', 'pool', 'spa'], response: 'Our fitness center is on the 1st floor, open 24/7. The pool and spa are on the rooftop, open 7 AM to 10 PM.', meta: { tone: 'neutral' } },
    { trigger: [], response: 'Is there anything else you\'d like to know about your stay?', meta: { tone: 'neutral' } },
  ],
}

function getHermesResponse(scenario: string, userMessage: string): { response: string; meta?: RoleplayMessage['meta'] } {
  const responses = HERMES_RESPONSES[scenario] || HERMES_RESPONSES['airport check-in']
  const lower = userMessage.toLowerCase()

  for (const r of responses) {
    if (r.trigger.length === 0 || r.trigger.some((t) => lower.includes(t))) {
      return { response: r.response, meta: r.meta }
    }
  }
  return { response: responses[responses.length - 1].response, meta: responses[responses.length - 1].meta }
}

interface MessageBubbleProps {
  message: RoleplayMessage
  isUser: boolean
}

function MessageBubble({ message, isUser }: MessageBubbleProps) {
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-blue-500/20 border border-blue-500/30 text-zinc-100 rounded-tr-sm'
            : 'bg-zinc-800/50 border border-zinc-700 text-zinc-300 rounded-tl-sm',
        )}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
        {message.meta && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded', message.meta.tone === 'encouraging' ? 'bg-emerald-500/20 text-emerald-400' : message.meta.tone === 'corrective' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400')}>
              {message.meta.tone}
            </span>
            {message.meta.correction && (
              <span className="text-[10px] text-zinc-500">💡 {message.meta.correction}</span>
            )}
            {message.meta.hint && (
              <span className="text-[10px] text-zinc-500">💭 {message.meta.hint}</span>
            )}
          </div>
        )}
        <p className="mt-1 text-[10px] text-zinc-600 text-right">
          {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-zinc-400" />
      )}
    </div>
  )
}

interface TypingIndicatorProps {
  visible: boolean
}

function TypingIndicator({ visible }: TypingIndicatorProps) {
  if (!visible) return null
  return (
    <div className="flex items-center gap-3 pl-11">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-2.5 rounded-tl-sm">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

interface RoleplayProps {
  session?: RoleplaySession
  onClose: () => void
  onSave?: (session: RoleplaySession) => void
}

export function Roleplay({ session: initialSession, onClose, onSave }: RoleplayProps) {
  const [session, setSession] = useState<RoleplaySession | null>(initialSession ?? null)
  const [messages, setMessages] = useState<RoleplayMessage[]>(initialSession?.messages ?? [])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [scenario, setScenario] = useState(initialSession?.scenario ?? 'airport check-in')
  const [level, setLevel] = useState(initialSession?.level ?? 'B1')
  const [active, setActive] = useState(!!initialSession)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const startNewSession = (newScenario: string, newLevel: 'A2' | 'B1' | 'B2') => {
    setScenario(newScenario)
    setLevel(newLevel)
    const newSession: RoleplaySession = {
      id: `rp-${Date.now()}`,
      scenario: newScenario,
      level: newLevel,
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: getInitialMessage(newScenario),
          timestamp: new Date().toISOString(),
          meta: { tone: 'encouraging' },
        },
      ],
      startedAt: new Date().toISOString(),
    }
    setSession(newSession)
    setMessages(newSession.messages)
    setActive(true)
  }

  const sendMessage = async () => {
    if (!input.trim() || !session) return

    const userMessage: RoleplayMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')

    // Simulate Hermes thinking
    setIsTyping(true)
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200))

    const { response, meta } = getHermesResponse(scenario, userMessage.content)
    const hermesMessage: RoleplayMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
      meta,
    }

    const finalMessages = [...newMessages, hermesMessage]
    setMessages(finalMessages)
    setSession({ ...session, messages: finalMessages })
    setIsTyping(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const saveSession = async () => {
    if (!session) return
    const completed = { ...session, messages, endedAt: new Date().toISOString() }
    await api.create<RoleplaySession>('roleplaySessions', completed)
    onSave?.(completed)
  }

  const scenarios = [
    { id: 'airport check-in', label: 'Aeroporto — Check-in', icon: MessageSquare },
    { id: 'job interview', label: 'Entrevista de emprego', icon: Sparkles },
    { id: 'ordering food', label: 'Restaurante — Pedido', icon: MessageSquare },
    { id: 'hotel check-in', label: 'Hotel — Check-in', icon: Sparkles },
  ] as const

  function getInitialMessage(scenario: string): string {
    switch (scenario) {
      case 'airport check-in':
        return 'Hello! Welcome to SkyAir check-in. May I see your passport and booking reference, please?'
      case 'job interview':
        return 'Good morning! Thanks for coming in. Let\'s start — tell me about yourself and your background.'
      case 'ordering food':
        return 'Good evening! Welcome to The Garden Bistro. Have you dined with us before, or would you like a menu?'
      case 'hotel check-in':
        return 'Welcome to the Grand Hotel! Do you have a reservation with us today?'
      default:
        return 'Hello! How can I help you today?'
    }
  }

  if (!active) {
    // Scenario selection screen
    return (
      <div className="flex flex-col h-[calc(100vh-200px)]">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <h2 className="font-medium text-zinc-100">Free Conversation</h2>
            <span className="chip bg-blue-500/15 text-blue-300 border-blue-500/30 text-xs">Hermes Roleplay</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl mx-auto space-y-6">
            <Card className="p-6 text-center">
              <div className="h-16 w-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="font-display text-xl font-bold text-zinc-100 mb-2">Pratique conversação com o Hermes</h3>
              <p className="text-zinc-400 mb-6">Escolha um cenário e converse naturalmente. O Hermes corrige, sugere e encoraja.</p>

              <div className="space-y-2 mb-6">
                <label className="block text-left text-sm font-medium text-zinc-300 mb-2">Nível</label>
                <div className="flex items-center justify-center gap-2">
                  {(['A2', 'B1', 'B2'] as const).map((l) => (
                    <Button
                      key={l}
                      variant={level === l ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setLevel(l)}
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {scenarios.map((s) => (
                  <Button
                    key={s.id}
                    variant="soft"
                    size="lg"
                    className="h-24 flex flex-col gap-2 bg-zinc-800/50 border-zinc-700 hover:border-blue-500/50 text-left"
                    onClick={() => startNewSession(s.id, level)}
                  >
                    <s.icon className="h-5 w-5 mx-auto text-blue-400" />
                    <span className="font-medium">{s.label}</span>
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-400" />
          <div>
            <p className="font-medium text-zinc-100">{scenarios.find((s) => s.id === scenario)?.label || scenario}</p>
            <p className="text-xs text-zinc-500">Nível {level} · {messages.filter((m) => m.role === 'user').length} mensagens</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setActive(false); setSession(null); }}>
            <RotateCcw className="h-4 w-4 mr-1" /> Novo cenário
          </Button>
          <Button variant="primary" size="sm" onClick={saveSession}>
            Salvar sessão
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="max-w-2xl mx-auto w-full space-y-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} isUser={m.role === 'user'} />
          ))}
          <TypingIndicator visible={isTyping} />
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur sticky bottom-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input
            type="text"
            className="input-base flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua resposta... (Enter para enviar)"
            autoFocus
            disabled={isTyping}
          />
          <Button variant="primary" size="lg" onClick={sendMessage} disabled={!input.trim() || isTyping}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-zinc-500">
          Dica: use frases completas. O Hermes vai corrigir e sugerir vocabulário naturalmente.
        </p>
      </div>
    </div>
  )
}