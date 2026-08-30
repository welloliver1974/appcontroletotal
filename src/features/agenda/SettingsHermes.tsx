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
  Camera,
  Save,
  Cloud,
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
  getDefaultVisionModel,
  getApiKeyForProvider,
  testProviderConnection,
  testVisionModel,
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
  const [testingProvider, setTestingProvider] = useState(false)
  const [testingVision, setTestingVision] = useState(false)
  const [visionStatus, setVisionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [visionLatency, setVisionLatency] = useState<number | null>(null)
  const [savedIndicator, setSavedIndicator] = useState(false)

  const updateConfig = (patch: Partial<HermesAdvancedConfig>) => {
    const next = { ...config, ...patch }
    setConfigState(next)
    saveHermesAdvancedConfig(next)
    setSavedIndicator(true)
    setTimeout(() => setSavedIndicator(false), 2500)
  }

  const handleManualSave = () => {
    saveHermesAdvancedConfig(config)
    setSavedIndicator(true)
    toast.success('Configurações salvas e sincronizadas com a nuvem! ☁️✨')
    setTimeout(() => setSavedIndicator(false), 3000)
  }

  const handleApiKeyChange = (val: string) => {
    const patch: Partial<HermesAdvancedConfig> = { llmApiKey: val }
    if (config.provider === 'groq') patch.groqApiKey = val
    else if (config.provider === 'openrouter') patch.openRouterApiKey = val
    else if (config.provider === 'nvidia') patch.nvidiaApiKey = val
    else if (config.provider === 'custom') patch.customApiKey = val
    updateConfig(patch)
  }

  const handleTestProvider = async () => {
    const currentKey = getApiKeyForProvider(config, config.provider)
    if (!currentKey && config.provider !== 'vps') {
      toast.warning(`Insira a chave da API da ${currentProvider.name} primeiro.`)
      return
    }

    setTestingProvider(true)
    setTestStatus('testing')
    setTestMessage(null)

    try {
      const res = await testProviderConnection(
        config.provider,
        currentKey,
        config.llmModel,
        config.customBaseUrl || config.vpsUrl,
      )

      if (res.ok) {
        setTestStatus('success')
        setLatencyMs(res.latencyMs)
        setTestMessage(res.reply)
        toast.success(`Conexão com ${currentProvider.name} estabelecida com sucesso! (${res.latencyMs}ms) 🚀`)
      } else {
        setTestStatus('error')
        setTestMessage(res.error || 'Falha na conexão com o provedor')
        toast.error(`Falha no teste: ${res.error || 'Erro desconhecido'}`)
      }
    } catch (err: any) {
      setTestStatus('error')
      setTestMessage(err?.message || 'Erro inesperado ao testar')
      toast.error('Erro de conexão com o provedor.')
    } finally {
      setTestingProvider(false)
    }
  }

  const handleTestVisionModel = async () => {
    const currentKey = getApiKeyForProvider(config, config.provider)
    if (!currentKey && config.provider !== 'vps') {
      toast.warning(`Insira a chave da API da ${currentProvider.name} primeiro.`)
      return
    }

    setTestingVision(true)
    setVisionStatus('testing')

    try {
      const res = await testVisionModel(
        config.provider,
        currentKey,
        activeVisionModel,
        config.customBaseUrl || config.vpsUrl,
      )

      if (res.ok) {
        setVisionStatus('success')
        setVisionLatency(res.latencyMs)
        toast.success(`Modelo de Visão validado com sucesso! (${res.latencyMs}ms) 📸`)
      } else {
        setVisionStatus('error')
        toast.error(`Falha no teste de visão: ${res.error || 'Modelo não aceitou imagem'}`)
      }
    } catch (err: any) {
      setVisionStatus('error')
      toast.error('Erro de conexão ao testar visão.')
    } finally {
      setTestingVision(false)
    }
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
    const currentKey = getApiKeyForProvider(config, config.provider)
    if (!currentKey && config.provider !== 'vps') {
      if (showToast) toast.warning('Insira a API Key primeiro para buscar os modelos.')
      return
    }

    setLoadingModels(true)
    const res = await fetchProviderModels(config.provider, currentKey, config.customBaseUrl || config.vpsUrl)
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
    const currentKey = getApiKeyForProvider(config, config.provider)
    if (currentKey && config.provider !== 'vps') {
      void handleFetchModels(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.provider])

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
  const activeApiKey = getApiKeyForProvider(config, config.provider)
  const activeVisionModel = config.visionModel || getDefaultVisionModel(config.provider)
  const visionModels = models.filter((m) => m.isVision)
  const otherModels = models.filter((m) => !m.isVision)

  return (
    <Card className="space-y-6 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <Bot className="h-5 w-5 text-indigo-400" />
          <div>
            <h3 className="font-medium text-zinc-100">Hermes Agent & Conexão com IA</h3>
            <p className="text-xs text-zinc-500">
              Conecte sua VPS com Cloudflare, LLMs (Groq, OpenRouter, NVIDIA) e Telegram
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all ${
              savedIndicator
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-800'
            }`}
          >
            <Cloud className={`h-3 w-3 ${savedIndicator ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
            <span>{savedIndicator ? 'Salvo & Sincronizado ☁️' : 'Auto-salvamento ativo'}</span>
          </span>

          <Button
            variant="primary"
            size="sm"
            onClick={handleManualSave}
            className="h-7 text-xs px-3 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Salvar Ajustes</span>
          </Button>
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
                  onClick={() => {
                    const keyForP = getApiKeyForProvider(config, pId)
                    updateConfig({
                      provider: pId,
                      llmApiKey: keyForP,
                      llmModel: p.defaultModel,
                      visionModel: p.defaultVisionModel,
                    })
                  }}
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

        {/* API Key Box with Dedicated Test Button */}
        {config.provider !== 'vps' && (
          <div className="space-y-3 rounded-2xl border border-indigo-500/30 bg-zinc-950/60 p-4">
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
                        handleApiKeyChange(text.trim())
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
                placeholder={config.provider === 'groq' ? 'gsk_...' : config.provider === 'openrouter' ? 'sk-or-v1-...' : config.provider === 'nvidia' ? 'nvapi-...' : 'sk-...'}
                value={activeApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
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

            {/* Direct Quick Test Button inside Provider Box */}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
              <div className="flex items-center gap-2">
                {testStatus === 'success' && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Online {latencyMs ? `(${latencyMs}ms)` : ''}
                  </span>
                )}
                {testStatus === 'error' && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5" /> Falha no teste
                  </span>
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleTestProvider}
                disabled={testingProvider || !activeApiKey}
                className="text-xs h-7 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                {testingProvider ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-amber-300" />}
                <span>Testar Chave & Conexão com {currentProvider.name}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Model Selector & Live Fetch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Modelo de Chat Principal */}
          <div className="space-y-1.5 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-indigo-400" /> Modelo de Chat (Hermes)
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFetchModels(true)}
                disabled={loadingModels}
                className="h-6 text-[11px] px-2 flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${loadingModels ? 'animate-spin' : ''}`} />
                {loadingModels ? 'Buscando...' : 'Atualizar Lista'}
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
            <p className="text-[10px] text-zinc-500">
              Usado para debriefings diários, consultas gerais e automações.
            </p>
          </div>

          {/* 2. Modelo de Visão / OCR de Cupons */}
          <div className="space-y-1.5 p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-purple-400" /> Modelo de Visão (Scanner de Cupons)
              </label>
              <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                Multimodal OCR
              </span>
            </div>

            {models.length > 0 ? (
              <select
                value={activeVisionModel}
                onChange={(e) => updateConfig({ visionModel: e.target.value })}
                className="input-base text-xs font-mono border-purple-500/30 focus:border-purple-400"
              >
                {visionModels.length > 0 && (
                  <optgroup label="✨ Modelos com Suporte a Visão (Recomendados)">
                    {visionModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        📸 {m.id} {m.name !== m.id ? `(${m.name})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherModels.length > 0 && (
                  <optgroup label="Demais Modelos">
                    {otherModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            ) : (
              <input
                type="text"
                placeholder={getDefaultVisionModel(config.provider)}
                value={activeVisionModel}
                onChange={(e) => updateConfig({ visionModel: e.target.value })}
                className="input-base font-mono text-xs border-purple-500/30 focus:border-purple-400"
              />
            )}
            <p className="text-[10px] text-zinc-400">
              Usado para extrair itens, preços e mercado de fotos de cupom fiscal.
            </p>

            {/* Direct Quick Test Button for Vision Model */}
            <div className="flex items-center justify-between pt-2 border-t border-purple-500/20">
              <div className="flex items-center gap-1.5">
                {visionStatus === 'success' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    <Check className="h-3 w-3" /> Visão OK {visionLatency ? `(${visionLatency}ms)` : ''}
                  </span>
                )}
                {visionStatus === 'error' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400">
                    <AlertCircle className="h-3 w-3" /> Falha OCR
                  </span>
                )}
              </div>

              <Button
                variant="soft"
                size="sm"
                onClick={handleTestVisionModel}
                disabled={testingVision || !activeApiKey}
                className="text-[11px] h-6 px-2.5 gap-1.5 border border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 font-medium"
              >
                {testingVision ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3 text-purple-400" />}
                <span>Testar Modelo de Visão (OCR)</span>
              </Button>
            </div>
          </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Token do Bot Telegram (@BotFather)</label>
              <input
                type="password"
                placeholder="123456789:ABCdef..."
                value={config.telegramBotToken || ''}
                onChange={(e) => updateConfig({ telegramBotToken: e.target.value })}
                className="input-base text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Seu Chat ID Telegram (via @userinfobot)</label>
              <input
                type="text"
                placeholder="Ex: 123456789"
                value={config.telegramChatId || ''}
                onChange={(e) => updateConfig({ telegramChatId: e.target.value })}
                className="input-base text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Voz do Hermes (TTS) */}
        <div className="space-y-3 border-t border-zinc-800 pt-4">
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5 text-purple-400" />
            Voz do Hermes (Locução & Leitura por Voz)
          </h4>

          <div className="space-y-2">
            <label className="text-xs text-zinc-300">Escolha o gênero da voz para narrações e briefings:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  import('@/lib/speechSynthesis').then((m) => {
                    m.setVoiceGender('female')
                    m.speakText('Olá! Esta é a voz feminina do Hermes para o seu dia.')
                  })
                  toast.success('Voz definida como Feminina 👩')
                }}
                className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 text-left transition-all flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                  <span>👩 Feminina</span>
                </div>
                <span className="text-[10px] text-zinc-400">Tom claro e dinâmico</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  import('@/lib/speechSynthesis').then((m) => {
                    m.setVoiceGender('male')
                    m.speakText('Olá! Esta é a voz masculina do Hermes para o seu dia.')
                  })
                  toast.success('Voz definida como Masculina 👨')
                }}
                className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-900/30 text-left transition-all flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                  <span>👨 Masculina</span>
                </div>
                <span className="text-[10px] text-zinc-400">Tom encorpado e executivo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  import('@/lib/speechSynthesis').then((m) => {
                    m.setVoiceGender('auto')
                    m.speakText('Olá! Esta é a voz padrão do sistema operacional.')
                  })
                  toast.success('Voz definida como Padrão do Sistema 🤖')
                }}
                className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/40 text-left transition-all flex flex-col gap-0.5 col-span-2 sm:col-span-1"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  <span>🤖 Padrão do Sistema</span>
                </div>
                <span className="text-[10px] text-zinc-400">Voz nativa do aparelho</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action & Test buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
          <div className="flex flex-wrap items-center gap-3">
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

          <Button
            variant="primary"
            size="sm"
            onClick={handleManualSave}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-900/30"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Salvar Configurações</span>
          </Button>
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
