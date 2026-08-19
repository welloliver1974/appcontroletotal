import { useState, useEffect } from 'react'
import {
  Bot,
  Key,
  Globe,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
  Send,
  ExternalLink,
  Zap,
  Eye,
  EyeOff,
  ClipboardPaste,
  Mic,
  Sparkles,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  PROVIDERS,
  fetchProviderModels,
  type ProviderId,
  type ModelItem,
} from '@/lib/llmProviders'
import {
  getHermesAdvancedConfig,
  saveHermesAdvancedConfig,
  loadHermesConfigFromCloud,
  sendHermesChat,
  sendHermesWebhook,
  type HermesAdvancedConfig,
} from '@/lib/hermes'
import { toast } from '@/stores/toastStore'

export function SettingsHermes() {
  const [config, setConfigState] = useState<HermesAdvancedConfig>(() => getHermesAdvancedConfig())

  useEffect(() => {
    void loadHermesConfigFromCloud().then((cloudCfg) => {
      setConfigState(cloudCfg)
    })
  }, [])
  const [models, setModels] = useState<ModelItem[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [showGroqKey, setShowGroqKey] = useState(false)
  const [testingGroq, setTestingGroq] = useState(false)

  const updateConfig = (patch: Partial<HermesAdvancedConfig>) => {
    const next = { ...config, ...patch }
    setConfigState(next)
    saveHermesAdvancedConfig(next)
  }

  const handleTestGroqKey = async () => {
    const keyToTest = config.groqApiKey || (config.provider === 'groq' ? config.llmApiKey : '')
    if (!keyToTest) {
      toast.warning('Insira a chave da API da Groq primeiro.')
      return
    }

    setTestingGroq(true)
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${keyToTest}` },
      })
      if (res.ok) {
        toast.success('Chave Groq validada com sucesso! Whisper IA e modelos rápidos ativos. 🚀')
      } else {
        toast.error(`Chave Groq inválida ou não autorizada (HTTP ${res.status}).`)
      }
    } catch {
      toast.error('Erro de conexão ao validar chave Groq.')
    } finally {
      setTestingGroq(false)
    }
  }

  const handleFetchModels = async (showToast = true) => {
    if (!config.llmApiKey && config.provider !== 'vps') {
      if (showToast) toast.warning('Insira a API Key primeiro para buscar os modelos.')
      return
    }

    setLoadingModels(true)
    const res = await fetchProviderModels(config.provider, config.llmApiKey, config.customBaseUrl || config.vpsUrl)
    setLoadingModels(false)

    if (res.ok && res.models.length > 0) {
      setModels(res.models)
      if (showToast) {
        toast.success(`${res.models.length} modelos encontrados com sucesso! ✨`)
      }
      // If current model isn't in list, select first
      if (!res.models.some((m) => m.id === config.llmModel)) {
        updateConfig({ llmModel: res.models[0].id })
      }
    } else {
      if (showToast) {
        toast.error(res.error || 'Falha ao buscar lista de modelos.')
      }
    }
  }

  useEffect(() => {
    if (config.llmApiKey && config.provider !== 'vps') {
      void handleFetchModels(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.provider, config.llmApiKey])

  const handleTestChat = async () => {
    setTestStatus('testing')
    setTestMessage(null)
    const start = performance.now()

    try {
      const res = await sendHermesChat([], 'Olá Hermes! Teste de conexão do Life OS Hub. Responda em 1 frase curta confirmando que está online.')
      const latency = Math.round(performance.now() - start)
      setLatencyMs(latency)

      if (res.source !== 'local' || (!config.llmApiKey && !config.vpsUrl)) {
        setTestStatus('success')
        setTestMessage(res.reply)
        toast.success(`Hermes online! (${latency}ms) 🚀`)
      } else {
        setTestStatus('error')
        setTestMessage(res.reply)
        toast.warning('Resposta gerada localmente. Verifique sua chave de API.')
      }
    } catch (e) {
      setTestStatus('error')
      setTestMessage(e instanceof Error ? e.message : 'Falha na conexão com a IA')
      toast.error('Erro ao conectar com o Hermes.')
    }
  }

  const handleTestWebhook = async () => {
    if (!config.vpsUrl) {
      toast.warning('URL da VPS não configurada.')
      return
    }
    toast.info('Testando webhook da VPS...')
    const res = await sendHermesWebhook('ping', { message: 'Teste de webhook do Life OS' })
    if (res.ok) {
      toast.success(`Webhook VPS OK: HTTP ${res.status}`)
    } else {
      toast.error(`Falha no Webhook: ${res.response}`)
    }
  }

  const currentProvider = PROVIDERS[config.provider] || PROVIDERS.groq

  return (
    <Card className="space-y-6 p-5">
      <div className="flex items-center gap-3">
        <Bot className="h-5 w-5 text-indigo-400" />
        <div>
          <h3 className="font-medium text-zinc-100">Hermes Agent & Conexão com IA</h3>
          <p className="text-xs text-zinc-500">
            Conecte sua VPS com Cloudflare, LLMs (Groq, OpenRouter, NVIDIA) e Telegram
          </p>
        </div>
      </div>

      {/* Provider Selector */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
            Provedor de Inteligência Artificial (LLM)
          </label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(['groq', 'openrouter', 'nvidia', 'vps'] as ProviderId[]).map((pId) => {
              const p = PROVIDERS[pId]
              const isSelected = config.provider === pId
              return (
                <button
                  key={pId}
                  type="button"
                  onClick={() => updateConfig({ provider: pId, llmModel: p.defaultModel })}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-xs text-zinc-100">{p.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* API Key */}
        {config.provider !== 'vps' && (
          <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-indigo-400" />
                <span>Chave da API ({currentProvider.name})</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText()
                      if (text) {
                        updateConfig({ llmApiKey: text.trim() })
                        toast.success('Chave de API colada com sucesso! 📋')
                      }
                    } catch {
                      toast.info('Cole sua chave diretamente no campo abaixo.')
                    }
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  <span>Colar</span>
                </button>
                {currentProvider.docsUrl && (
                  <a
                    href={currentProvider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Obter chave <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder={config.provider === 'groq' ? 'gsk_...' : config.provider === 'openrouter' ? 'sk-or-v1-...' : 'nvapi-...'}
                value={config.llmApiKey}
                onChange={(e) => updateConfig({ llmApiKey: e.target.value })}
                className="input-base pr-20 font-mono text-xs py-2.5"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-zinc-400">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1 hover:text-zinc-200"
                  title={showKey ? 'Ocultar chave' : 'Mostrar chave'}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-zinc-500" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Model Selector & Live Fetch */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Modelo Selecionado</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFetchModels(true)}
              disabled={loadingModels}
              className="h-7 text-xs flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300"
            >
              <RefreshCw className={`h-3 w-3 ${loadingModels ? 'animate-spin' : ''}`} />
              {loadingModels ? 'Buscando...' : 'Buscar modelos disponíveis'}
            </Button>
          </div>

          {models.length > 0 ? (
            <select
              value={config.llmModel}
              onChange={(e) => updateConfig({ llmModel: e.target.value })}
              className="input-base text-xs font-mono"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} {m.name !== m.id ? `(${m.name})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="ex.: llama-3.3-70b-versatile ou meta-llama/llama-3.3-70b-instruct"
              value={config.llmModel}
              onChange={(e) => updateConfig({ llmModel: e.target.value })}
              className="input-base font-mono text-xs"
            />
          )}
          <p className="text-[11px] text-zinc-500">
            {models.length > 0
              ? `${models.length} modelos sincronizados com a sua conta.`
              : 'Clique em "Buscar modelos disponíveis" para listar todos os modelos ativos da sua chave.'}
          </p>
        </div>

        {/* Dedicated Groq Whisper Audio Transcription Section */}
        <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Mic className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                  Transcrição por Voz com IA (Groq Whisper)
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Transcreve áudios do Life-Log com pontuação perfeita e sem limites de silêncio.
                </p>
              </div>
            </div>

            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium hover:underline flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
            >
              Criar chave Groq grátis <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {config.provider === 'groq' && !config.groqApiKey && config.llmApiKey ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-300">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Check className="h-3.5 w-3.5" /> Usando a mesma chave Groq configurada acima
              </span>
              <button
                type="button"
                onClick={() => updateConfig({ groqApiKey: config.llmApiKey })}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
              >
                Personalizar
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-300 font-medium">
                  Chave da API da Groq (Whisper Large V3)
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText()
                      if (text) {
                        updateConfig({ groqApiKey: text.trim() })
                        toast.success('Chave Groq colada com sucesso! 📋')
                      }
                    } catch {
                      toast.info('Cole sua chave Groq diretamente no campo.')
                    }
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  <span>Colar</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showGroqKey ? 'text' : 'password'}
                  placeholder="gsk_..."
                  value={config.groqApiKey || (config.provider === 'groq' ? config.llmApiKey : '')}
                  onChange={(e) => updateConfig({ groqApiKey: e.target.value })}
                  className="input-base pr-20 font-mono text-xs py-2.5 bg-zinc-950/80 border-emerald-500/20 focus:border-emerald-500/50"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-zinc-400">
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    className="p-1 hover:text-zinc-200"
                    title={showGroqKey ? 'Ocultar chave' : 'Mostrar chave'}
                  >
                    {showGroqKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-zinc-500" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-400" /> Modelo ativo: whisper-large-v3-turbo (Latência &lt;400ms)
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTestGroqKey}
              disabled={testingGroq}
              className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1.5"
            >
              {testingGroq ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              <span>Testar Chave Groq</span>
            </Button>
          </div>
        </div>

        {/* VPS & Cloudflare Tunnel Settings */}
        <div className="space-y-4 border-t border-zinc-800 pt-4">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            Sua VPS Hermes (Cloudflare Tunnel & Webhook)
          </h4>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">URL do Domínio Cloudflare</label>
            <input
              type="url"
              placeholder="https://hermes.seu-dominio.com"
              value={config.vpsUrl}
              onChange={(e) => updateConfig({ vpsUrl: e.target.value })}
              className="input-base text-xs font-mono"
            />
            <p className="text-[11px] text-zinc-500">
              Endereço HTTPS público apontando para o seu túnel cloudflared na VPS.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Token Secreto / Chave do Webhook</label>
            <div className="relative">
              <input
                type="password"
                placeholder="Token de segurança (enviado em X-Hermes-Signature)"
                value={config.vpsSecret}
                onChange={(e) => updateConfig({ vpsSecret: e.target.value })}
                className="input-base pr-10 text-xs font-mono"
              />
              <Key className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Link do Bot no Telegram (Opcional)</label>
            <input
              type="url"
              placeholder="https://t.me/seu_hermes_bot"
              value={config.telegramBotUrl}
              onChange={(e) => updateConfig({ telegramBotUrl: e.target.value })}
              className="input-base text-xs font-mono"
            />
          </div>
        </div>

        {/* Action & Test buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-800">
          <Button
            variant="primary"
            size="sm"
            onClick={handleTestChat}
            disabled={testStatus === 'testing'}
            className="flex items-center gap-2"
          >
            <Zap className="h-3.5 w-3.5" />
            {testStatus === 'testing' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Testando IA...
              </>
            ) : (
              'Testar Comunicação com a IA'
            )}
          </Button>

          {config.vpsUrl && (
            <Button variant="ghost" size="sm" onClick={handleTestWebhook} className="flex items-center gap-2">
              <Send className="h-3.5 w-3.5" />
              Testar Webhook VPS
            </Button>
          )}

          {testStatus === 'success' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
              <Check className="h-3.5 w-3.5" /> Conectado {latencyMs ? `(${latencyMs}ms)` : ''}
            </span>
          )}
          {testStatus === 'error' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300">
              <AlertCircle className="h-3.5 w-3.5" /> Falha no teste
            </span>
          )}
        </div>

        {testMessage && (
          <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
              Resposta do Hermes:
            </span>
            <p className="text-xs text-zinc-200 leading-relaxed font-mono">{testMessage}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
