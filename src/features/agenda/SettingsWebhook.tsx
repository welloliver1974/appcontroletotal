import { useState, useEffect, useCallback } from 'react'
import { Send, Check, Loader2, AlertCircle, WifiOff, Shield, Key, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'

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
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [testResult, setTestResult] = useState<{ ok: boolean; status: number; response: string } | null>(null)
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    setConfigState(getConfig())
  }, [])

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfig = { ...config, url: e.target.value }
    setConfigState(newConfig)
    setConfig(newConfig)
  }

  const handleSecretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfig = { ...config, secret: e.target.value }
    setConfigState(newConfig)
    setConfig(newConfig)
  }

  const handleEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfig = { ...config, enabled: e.target.checked }
    setConfigState(newConfig)
    setConfig(newConfig)
  }

  const handleTest = useCallback(async () => {
    if (!config.url.trim()) return
    setTestStatus('sending')
    setTestResult(null)
    const result = await sendWebhook(config, generateTestPayload())
    setTestResult(result)
    setTestStatus(result.ok ? 'success' : 'error')
  }, [config])

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <WifiOff className="h-5 w-5 text-cyan-400" />
        <div>
          <h3 className="font-medium text-zinc-100">Webhook Hermes (Mock)</h3>
          <p className="text-xs text-zinc-500">Endpoint para receber eventos externos (IFTTT, n8n, etc.)</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            <Shield className="h-4 w-4 inline mr-1" /> URL do Webhook
          </label>
          <input
            type="url"
            className="input-base"
            value={config.url}
            onChange={handleUrlChange}
            placeholder="https://seu-endpoint.com/webhook/hermes"
            disabled={config.enabled}
          />
          <p className="mt-1 text-[11px] text-zinc-500">
            Endpoint que receberá POST com JSON. Deixe vazio para desativar.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Key className="h-4 w-4 inline" /> Segredo (opcional)
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300"
              onClick={() => setShowSecret(!showSecret)}
              aria-label={showSecret ? 'Ocultar segredo' : 'Mostrar segredo'}
            >
              {showSecret ? <WifiOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            </Button>
          </label>
          <input
            type={showSecret ? 'text' : 'password'}
            className="input-base"
            value={config.secret}
            onChange={handleSecretChange}
            placeholder="Segredo compartilhado para validação (HMAC)"
            disabled={config.enabled}
          />
          <p className="mt-1 text-[11px] text-zinc-500">
            Enviado no header <code className="font-mono text-zinc-400">X-Hermes-Signature</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="webhook-enabled"
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
            checked={config.enabled}
            onChange={handleEnabledChange}
          />
          <label htmlFor="webhook-enabled" className="flex-1 cursor-pointer text-sm text-zinc-300">
            Webhook ativo
          </label>
          {config.enabled && config.url && (
            <span className="chip bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
              Ativo
            </span>
          )}
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
          <p><strong>Formato do payload:</strong></p>
          <pre className="font-mono bg-zinc-900/50 p-2 rounded text-[10px] overflow-x-auto">
{JSON.stringify({
  module: 'despensa|viagens|manutencao|...',
  action: 'created|updated|alert|...',
  timestamp: '2026-08-14T...',
  data: { '...': '...' },
}, null, 2)}
          </pre>
          <p className="text-[10px]">Exemplos de uso: IFTTT, n8n, Zapier, Make, webhook.site para testes.</p>
        </div>
      </div>

      {/* Test Result Modal */}
      {testModalOpen && (
        <Modal
          open={true}
          onClose={() => setTestModalOpen(false)}
          title="Resultado do Teste"
        >
          <div className="space-y-3">
            {testStatus === 'success' ? (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 mx-auto text-emerald-400 mb-2" />
                <h4 className="font-medium text-zinc-100">Webhook respondeu com sucesso!</h4>
                <p className="text-sm text-zinc-400 mt-1">Status: {testResult?.status}</p>
              </div>
            ) : testStatus === 'error' ? (
              <div className="text-center py-4">
                <AlertCircle className="h-12 w-12 mx-auto text-rose-400 mb-2" />
                <h4 className="font-medium text-rose-300">Falha na conexão</h4>
                <p className="text-sm text-zinc-400 mt-1">Status: {testResult?.status}</p>
                <p className="text-xs text-zinc-500 mt-2">{testResult?.response}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-indigo-400" />
                <p className="mt-2 text-zinc-400">Enviando teste…</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="primary" size="sm" onClick={() => setTestModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  )
}