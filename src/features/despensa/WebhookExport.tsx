import { useState } from 'react'
import { AlertCircle, Check, Loader2, Send } from 'lucide-react'
import type { PantryItem } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { buildShoppingList } from './despensaUtils'
import { getHermesConfig, sendHermesWebhook, type HermesWebhookResult } from '@/lib/hermes'
import { toast } from '@/stores/toastStore'

type Status = 'idle' | 'sending' | 'success' | 'error'

/**
 * Webhook export to "Hermes Agent": forwards the shopping list (low stock +
 * expiring ≤ 7d) to the configured Hermes endpoint (WhatsApp/VPS).
 */
export function WebhookExport({ items }: { items: PantryItem[] }) {
  const [status, setStatus] = useState<Status>('idle')
  const [payload, setPayload] = useState('')
  const [result, setResult] = useState<HermesWebhookResult | null>(null)
  const config = getHermesConfig()

  const exportList = async () => {
    if (status === 'sending') return
    const text = buildShoppingList(items)
    setPayload(text)
    setStatus('sending')
    setResult(null)

    const res = await sendHermesWebhook('shopping_list.export', {
      text,
      itemCount: items.length,
      exportedAt: new Date().toISOString(),
    })

    setResult(res)
    setStatus(res.ok ? 'success' : 'error')

    if (res.ok) {
      toast.success('Lista de compras enviada ao Hermes Agent! 🚀')
    } else {
      toast.error(`Falha no envio: ${res.response}`)
    }
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100">Webhook · Hermes Agent</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Exporta a lista de compras (estoque baixo + vencendo ≤ 7d) para o Hermes no WhatsApp / VPS.
          </p>
        </div>
        {status === 'sending' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Enviando…
          </span>
        )}
        {status === 'success' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
            <Check className="h-3.5 w-3.5" /> Enviado ({result?.status || 200})
          </span>
        )}
        {status === 'error' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300">
            <AlertCircle className="h-3.5 w-3.5" /> Erro ({result?.status || 0})
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={exportList} disabled={status === 'sending'} className="flex items-center gap-2">
          <Send className="h-3.5 w-3.5" />
          {status === 'sending' ? 'Exportando…' : 'Exportar lista de compras'}
        </Button>
        {config.webhookUrl && (
          <span className="text-[11px] text-zinc-500 truncate max-w-xs font-mono">
            {config.webhookUrl}
          </span>
        )}
      </div>

      {payload && (
        <div className="space-y-1.5">
          <pre className={cn('overflow-x-auto rounded-xl bg-zinc-950/70 p-3 font-mono text-[11px] leading-relaxed', payload.length > 5 ? 'text-zinc-300' : 'text-zinc-500')}>
            {payload}
          </pre>
          {result && !result.ok && (
            <p className="text-[11px] text-rose-400">
              {result.response} (Configure a URL do Webhook em Configurações)
            </p>
          )}
        </div>
      )}
    </div>
  )
}