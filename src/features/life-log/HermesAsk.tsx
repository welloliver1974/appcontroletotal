import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUpRight, Sparkles, Bot } from 'lucide-react'
import type { LifeLogEntry } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { composeHermesAnswer, rankHits } from './logUtils'
import { queryHermesAI } from '@/lib/hermes'

type AskState =
  | { status: 'idle' }
  | { status: 'thinking' }
  | { status: 'done'; answer: string; source: 'api' | 'local' }

/** Hermes Assistant: synthesizes diary entries with AI API or local semantic matching. */
export function HermesAsk({ entries }: { entries: LifeLogEntry[] }) {
  const [question, setQuestion] = useState('')
  const [ask, setAsk] = useState<AskState>({ status: 'idle' })
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const handleAsk = async (e: FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || ask.status === 'thinking') return
    setAsk({ status: 'thinking' })

    const contextEntries = rankHits(entries, q).slice(0, 5)
    const contextText = contextEntries
      .map((h) => `[${h.entry.createdAt?.slice(0, 10) || ''}] ${h.entry.title}: ${h.entry.body}`)
      .join('\n')

    // Try AI endpoint first
    const aiResult = await queryHermesAI(q, contextText)
    if (aiResult) {
      setAsk({ status: 'done', answer: aiResult.answer, source: 'api' })
      return
    }

    // Fallback to fast local synthesis
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setAsk({ status: 'done', answer: composeHermesAnswer(q, contextEntries), source: 'local' })
    }, 800)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Pergunte ao seu diário"
        subtitle="Hermes sintetiza suas anotações"
        action={<Sparkles className="h-4 w-4 text-emerald-400" />}
      />
      <div className="p-4">
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            className="input-base"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="ex.: como foi minha semana de foco?"
            aria-label="Pergunta ao Hermes"
          />
          <Button variant="primary" type="submit" className="shrink-0" disabled={ask.status === 'thinking'}>
            Perguntar
          </Button>
        </form>

        <div className="mt-3" aria-live="polite">
          {ask.status === 'thinking' && (
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
              <span className="ml-1 text-xs text-zinc-500">Hermes está lendo seu diário…</span>
            </div>
          )}

          {ask.status === 'done' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                  {ask.source === 'api' ? (
                    <>
                      <Bot className="h-3.5 w-3.5 text-emerald-400" />
                      Hermes AI Cloud
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                      Sintetizador Local
                    </>
                  )}
                </span>
              </div>
              <div className="whitespace-pre-line rounded-xl border-l-2 border-emerald-500/50 bg-white/[0.02] p-4 text-sm leading-relaxed text-zinc-300">
                {ask.answer}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAsk({ status: 'idle' })
                  setQuestion('')
                }}
              >
                Limpar <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}