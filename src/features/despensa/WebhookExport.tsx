import { useEffect, useRef, useState } from 'react'
import { Check, Send } from 'lucide-react'
import type { PantryItem } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { buildShoppingList } from './despensaUtils'

type Status = 'idle' | 'sending' | 'sent'

const HERMES_URL = 'https://hermes.agent/v1/webhook/despensa'

/**
 * Mock webhook export to "Hermes Agent": forwards the shopping list (low stock +
 * expiring ≤ 7d) with a simulated send and a payload preview. Real integration in Fase 8.
 */
export function WebhookExport({ items }: { items: PantryItem[] }) {
  const [status, setStatus] = useState<Status>('idle')
  const [payload, setPayload] = useState('')
  const timer = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
    },
    [],
  )

  const exportList = () => {
    if (status === 'sending') return
    setPayload(buildShoppingList(items))
    setStatus('sending')
    timer.current = window.setTimeout(() => setStatus('sent'), 900)
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100">Webhook · Hermes Agent</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Exporta a lista de compras (estoque baixo + vencendo ≤ 7d) para o Hermes no WhatsApp.
          </p>
        </div>
        {status === 'sending' && (
          <span className="pulse-dot inline-flex items-center gap-1.5 text-xs font-medium text-purple-300">
            Enviando…
          </span>
        )}
        {status === 'sent' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
            <Check className="h-3.5 w-3.5" /> Enviado (mock)
          </span>
        )}
      </div>

      <Button variant="primary" size="sm" onClick={exportList} disabled={status === 'sending'}>
        <Send className="h-3.5 w-3.5" />
        {status === 'sending' ? 'Exportando…' : 'Exportar lista de compras'}
      </Button>

      {status !== 'idle' && (
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] break-all text-zinc-600">→ {HERMES_URL}</p>
          <pre className={cn('overflow-x-auto rounded-xl bg-zinc-950/70 p-3 font-mono text-[11px] leading-relaxed', payload.length > 5 ? 'text-zinc-300' : 'text-zinc-500')}>
            {payload}
          </pre>
          {status === 'sent' && (
            <p className="text-[11px] text-zinc-600">
              Simulação — a integração real chega na Fase 8 (webhook Hermes).
            </p>
          )}
        </div>
      )}
    </div>
  )
}