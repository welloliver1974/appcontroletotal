import { useState, useCallback } from 'react'
import { Send, Check, Loader2, AlertCircle, Shield, Key } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/stores/toastStore'

const STORAGE_KEY = 'act.webhookConfig'

interface WebhookConfig {
  url: string
  secret: string
  enabled: boolean
}

interface TestPayload {
  module: string
  action: string
  timestamp: string
  data: Record<string, unknown>
}

function getConfig(): WebhookConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as WebhookConfig
  } catch {}
  return { url: '', secret: '', enabled: false }
}

function setConfig(config: WebhookConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

async function sendWebhook(config: WebhookConfig, payload: TestPayload): Promise<{ ok: boolean; status: number; response: string }> {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.secret) {
    headers['X-Hermes-Signature'] = config.secret
  }

  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers,
      body,
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, response: text }
  } catch (err) {
    return { ok: false, status: 0, response: err instanceof Error ? err.message : 'Erro de rede' }
  }
}

function generateTestPayload(): TestPayload {
  return {
    module: 'test',
    action: 'ping',
    timestamp: new Date().toISOString(),
    data: {
      message: 'Teste de conectividade do Life OS Hub',
      source: 'webhook-config',
    },
  }
}

export function SettingsWebhook() {
  const [config, setConfigState] = useState<WebhookConfig>(() => getConfig())
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [testResult, setTestResult] = useState<{ ok: boolean; status: number; response: string } | null>(null)

  const updateConfig = useCallback((patch: Partial<WebhookConfig>) => {
    const next = { ...config, ...patch }
    setConfigState(next)
    setConfig(next)
  }, [config])

  const handleTest = async () => {
    if (!config.url.trim()) return
    setTestStatus('sending')
    setTestResult(null)
    try {
      const result = await sendWebhook(config, generateTestPayload())
      setTestResult(result)
      setTestStatus(result.ok ? 'success' : 'error')
      if (result.ok) {
        toast.success('Webhook testado com sucesso ✓')
      } else {
        toast.error(`Webhook falhou: HTTP ${result.status}`)
      }
    } catch {
      setTestStatus('error')
      toast.error('Erro de rede ao testar webhook')
    }
  }

  return (
    <Card className="space-y-6 p-5">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-rose-400" />
        <div>
          <h3 className="font-medium text-zinc-100">Webhook Hermes (mock)</h3>
          <p className="text-xs text-zinc-500">
            Endpoint remoto para receber notificações de eventos do app (simulado)
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">URL do Webhook</label>
          <input
            type="url"
            placeholder="https://seu-servidor.com/webhook/hermes"
            value={config.url}
            onChange={(e) => updateConfig({ url: e.target.value })}
            className="input-base"
          />
          <p className="text-[11px] text-zinc-500">Endpoint POST que receberá os eventos do Life OS Hub</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Chave secreta (HMAC)</label>
          <div className="relative">
            <input
              type="password"
              placeholder="Opcional — para assinar payloads"
              value={config.secret}
              onChange={(e) => updateConfig({ secret: e.target.value })}
              className="input-base pr-10"
            />
            <Key className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          </div>
          <p className="text-[11px] text-zinc-500">Enviado no header <code className="font-mono text-zinc-300">X-Hermes-Signature</code></p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => updateConfig({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-rose-500 focus:ring-rose-500"
            />
            <span className="text-sm text-zinc-100">Webhook ativo</span>
          </label>
          <span className="text-[11px] text-zinc-500">
            {config.enabled ? 'Enviando eventos' : 'Desativado'}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
          <Button variant="primary" size="sm" onClick={handleTest} disabled={!config.url.trim() || testStatus === 'sending'} className="flex items-center gap-2">
            <Send className="h-3.5 w-3.5" />
            {testStatus === 'sending' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Testando…
              </>
            ) : (
              'Testar Webhook'
            )}
          </Button>
          {testStatus === 'success' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
              <Check className="h-3.5 w-3.5" /> OK (200)
            </span>
          )}
          {testStatus === 'error' && testResult && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300">
              <AlertCircle className="h-3.5 w-3.5" /> Erro {testResult.status}
            </span>
          )}
        </div>

        {testResult && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400 flex items-center gap-1">
              Detalhes da resposta
              <Check className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-zinc-950/70 p-3 font-mono text-[10px] leading-relaxed text-zinc-400 max-h-48">
              {JSON.stringify(
                {
                  status: testResult.status,
                  ok: testResult.ok,
                  response: testResult.response.slice(0, 1000),
                },
                null,
                2
              )}
            </pre>
          </details>
        )}

        <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800 text-[11px] text-zinc-500 space-y-1">
          <p><strong className="text-zinc-300">Eventos simulados (mock):</strong></p>
          <p>• <code className="font-mono text-zinc-300">item.created</code> — novo item (despensa, ativo, viagem, etc.)</p>
          <p>• <code className="font-mono text-zinc-300">item.updated</code> — alteração de item</p>
          <p>• <code className="font-mono text-zinc-300">item.deleted</code> — exclusão</p>
          <p>• <code className="font-mono text-zinc-300">backup.completed</code> — backup automático finalizado</p>
          <p className="pt-1"><strong className="text-zinc-300">Integração real:</strong> fase futura com credenciais WhatsApp/Telegram/Drive.</p>
        </div>
      </div>
    </Card>
  )
}