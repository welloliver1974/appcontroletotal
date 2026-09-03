import { useState, useEffect } from 'react'
import {
  Bot,
  Key,
  Globe,
  Send,
  Save,
  Check,
  Zap,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Cloud,
  Loader2,
  Sparkles,
  RefreshCw,
  Camera,
  ClipboardPaste,
  Mic,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  PROVIDERS,
  CHAT_PROVIDERS,
  VISION_PROVIDERS,
  DEFAULT_GOOGLE_MODELS,
  DEFAULT_NVIDIA_MODELS,
  DEFAULT_OPENROUTER_MODELS,
  fetchProviderModels,
  type ModelItem,
} from '@/lib/llmProviders'
import {
  getHermesAdvancedConfig,
  saveHermesAdvancedConfig,
  loadHermesConfigFromCloud,
  normalizeVisionModelForProvider,
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

  const [chatModels, setChatModels] = useState<ModelItem[]>([])
  const [loadingChatModels, setLoadingChatModels] = useState(false)

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  const [showChatKey, setShowChatKey] = useState(false)
  const [showVisionKey, setShowVisionKey] = useState(false)
  const [showGroqKey, setShowGroqKey] = useState(false)

  const [testingChat, setTestingChat] = useState(false)
  const [testingVision, setTestingVision] = useState(false)
  const [testingGroq, setTestingGroq] = useState(false)

  const [visionStatus, setVisionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [visionMessage, setVisionMessage] = useState<string | null>(null)
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

  const handleChatApiKeyChange = (val: string) => {
    const patch: Partial<HermesAdvancedConfig> = { llmApiKey: val }
    if (config.provider === 'google') patch.googleApiKey = val
    else if (config.provider === 'groq') patch.groqApiKey = val
    else if (config.provider === 'openrouter') patch.openRouterApiKey = val
    else if (config.provider === 'nvidia') patch.nvidiaApiKey = val
    else if (config.provider === 'custom') patch.customApiKey = val
    updateConfig(patch)
  }

  const handleVisionApiKeyChange = (val: string) => {
    const vProvider = config.visionProvider || 'openrouter'
    const patch: Partial<HermesAdvancedConfig> = {}
    if (vProvider === 'google') patch.googleApiKey = val
    else if (vProvider === 'openrouter') patch.openRouterApiKey = val
    else if (vProvider === 'nvidia') patch.nvidiaApiKey = val
    else if (vProvider === 'custom') patch.customApiKey = val
    updateConfig(patch)
  }

  const handleFetchChatModels = async (showToast = true) => {
    const currentKey = getApiKeyForProvider(config, config.provider)
    setLoadingChatModels(true)

    const res = await fetchProviderModels(config.provider, currentKey, config.customBaseUrl)
    setLoadingChatModels(false)

    if (res.ok && res.models.length > 0) {
      setChatModels(res.models)
      if (showToast) {
        toast.success(`${res.models.length} modelos carregados da ${currentChatProvider.name}!`)
      }
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
      void handleFetchChatModels(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.provider])

  const handleTestChatProvider = async () => {
    const currentKey = getApiKeyForProvider(config, config.provider)
    if (!currentKey && config.provider !== 'vps') {
      toast.warning(`Insira a chave da API da ${currentChatProvider.name} primeiro.`)
      return
    }

    setTestingChat(true)
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
        toast.success(`Conexão com ${currentChatProvider.name} estabelecida com sucesso! (${res.latencyMs}ms) 🚀`)
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
      setTestingChat(false)
    }
  }

  const handleTestVisionModel = async () => {
    const vProvider = config.visionProvider || 'openrouter'
    const currentKey = getApiKeyForProvider(config, vProvider)

    if (vProvider === 'groq') {
      toast.error('A Groq não oferece modelos de visão. Selecione OpenRouter ou NVIDIA para o Scanner de Cupons.')
      return
    }

    if (!currentKey && vProvider !== 'vps') {
      toast.warning(`Insira a chave da API para ${PROVIDERS[vProvider]?.name || vProvider} primeiro.`)
      return
    }

    setTestingVision(true)
    setVisionStatus('testing')
    setVisionMessage(null)

    try {
      const res = await testVisionModel(
        vProvider,
        currentKey,
        config.visionModel,
        config.customBaseUrl || config.vpsUrl,
      )

      if (res.ok) {
        setVisionStatus('success')
        setVisionLatency(res.latencyMs)
        setVisionMessage(res.reply)
        toast.success(`Scanner de Visão (${PROVIDERS[vProvider]?.name}) validado com sucesso! (${res.latencyMs}ms) 📸`)
      } else {
        setVisionStatus('error')
        setVisionMessage(res.error || 'Falha no teste de visão')
        toast.error(`Falha no scanner de visão: ${res.error || 'Erro desconhecido'}`)
      }
    } catch (err: any) {
      setVisionStatus('error')
      setVisionMessage(err?.message || 'Erro de conexão ao testar visão')
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

  const currentChatProvider = PROVIDERS[config.provider] || PROVIDERS.groq
  const activeChatApiKey = getApiKeyForProvider(config, config.provider)

  const activeVisionProvider = config.visionProvider || 'openrouter'
  const currentVisionProvider = PROVIDERS[activeVisionProvider] || PROVIDERS.openrouter
  const activeVisionApiKey = getApiKeyForProvider(config, activeVisionProvider)

  const normalizedVisionModel = normalizeVisionModelForProvider(activeVisionProvider, config.visionModel)

  // Vision options for selected vision provider
    const visionPresetModels =
    activeVisionProvider === 'google'
      ? DEFAULT_GOOGLE_MODELS
      : activeVisionProvider === 'nvidia'
        ? DEFAULT_NVIDIA_MODELS.filter((m) => m.isVision)
        : DEFAULT_OPENROUTER_MODELS.filter((m) => m.isVision)

  return (
    <Card className="space-y-6 p-5">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <Bot className="h-5 w-5 text-indigo-400" />
          <div>
            <h3 className="font-medium text-zinc-100">Hermes Agent & Conexão com IA</h3>
            <p className="text-xs text-zinc-500">
              Configure provedores independentes para Chat (Hermes) e Scanner de Cupom (Visão OCR)
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
            <span>{savedIndicator ? 'Salvo & Sincronizado ✨' : 'Auto-salvamento ativo'}</span>
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

      {/* SEÇÃO 1: CHAT & ASSISTENTE HERMES */}
      <div className="space-y-4 rounded-2xl border border-indigo-500/30 bg-zinc-950/70 p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-2">
                <span>1. Provedor de Chat & Assistente Hermes</span>
                <span className="chip px-1.5 py-0 text-[9px] bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-mono">
                  Conversação & Raciocínio
                </span>
              </h4>
              <p className="text-[11px] text-zinc-400">
                Usado para debriefings matinais, consultas gerais no Life OS e automações de texto.
              </p>
            </div>
          </div>
        </div>

        {/* Chat Provider Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Selecione o Provedor do Chat:</label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(CHAT_PROVIDERS).map((pId) => {
              const p = PROVIDERS[pId]
              const isSelected = config.provider === pId
              const isGroq = pId === 'groq'
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
                  {isGroq && (
                    <span className="mt-1 text-[10px] text-emerald-400 font-medium">
                      ⚡ Recomendado (Ultra-Rápido & Free)
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Chat API Key Input */}
        {config.provider !== 'vps' && (
          <div className="space-y-2 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-indigo-400" />
                <span>Chave de API do Chat ({currentChatProvider.name})</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText()
                      if (text) {
                        handleChatApiKeyChange(text.trim())
                        toast.success('Chave colada com sucesso! 📋')
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
                {currentChatProvider.docsUrl && (
                  <a
                    href={currentChatProvider.docsUrl}
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
                type={showChatKey ? 'text' : 'password'}
                placeholder={
                  config.provider === 'google'
                    ? 'AIzaSy...'
                    : config.provider === 'groq'
                      ? 'gsk_...'
                    : config.provider === 'openrouter'
                      ? 'sk-or-v1-...'
                      : config.provider === 'nvidia'
                        ? 'nvapi-...'
                        : 'sk-...'
                }
                value={activeChatApiKey}
                onChange={(e) => handleChatApiKeyChange(e.target.value)}
                className="input-base pr-20 font-mono text-xs py-2.5"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-zinc-400">
                <button
                  type="button"
                  onClick={() => setShowChatKey(!showChatKey)}
                  className="p-1 hover:text-zinc-200"
                  title={showChatKey ? 'Ocultar chave' : 'Mostrar chave'}
                >
                  {showChatKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-zinc-500" />}
                </button>
              </div>
            </div>

            {/* Error Message Box */}
            {testStatus === 'error' && testMessage && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-200 leading-relaxed">
                <p className="font-semibold text-rose-300 flex items-center gap-1 mb-0.5">
                  <AlertCircle className="h-3 w-3 shrink-0" /> Diagnóstico do Teste:
                </p>
                {testMessage}
              </div>
            )}

            {/* Test Connection Button - 100% Mobile Responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-800/60">
              <div className="flex items-center gap-1.5 min-h-[22px]">
                {testStatus === 'success' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <Check className="h-3.5 w-3.5 shrink-0" /> Conexão OK {latencyMs ? `(${latencyMs}ms)` : ''}
                  </span>
                )}
                {testStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Falha no teste
                  </span>
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleTestChatProvider}
                disabled={testingChat || !activeChatApiKey}
                className="w-full sm:w-auto text-xs h-8 sm:h-7 px-3 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold justify-center shrink-0"
              >
                {testingChat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-300" />}
                <span>Testar Conexão</span>
              </Button>
            </div>
          </div>
        )}

        {/* Chat Model Selector */}
        <div className="space-y-1.5 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-indigo-400" /> Modelo de Chat Ativo
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFetchChatModels(true)}
              disabled={loadingChatModels}
              className="h-6 text-[11px] px-2 flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
            >
              <RefreshCw className={`h-2.5 w-2.5 ${loadingChatModels ? 'animate-spin' : ''}`} />
              {loadingChatModels ? 'Buscando...' : 'Atualizar Modelos'}
            </Button>
          </div>

          {chatModels.length > 0 ? (
            <select
              value={config.llmModel}
              onChange={(e) => updateConfig({ llmModel: e.target.value })}
              className="input-base text-xs font-mono"
            >
              {chatModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} {m.name !== m.id ? `(${m.name})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="ex.: openai/gpt-oss-120b ou meta/llama-3.3-70b-instruct"
              value={config.llmModel}
              onChange={(e) => updateConfig({ llmModel: e.target.value })}
              className="input-base font-mono text-xs"
            />
          )}
        </div>
      </div>

      {/* SEÇÃO 2: SCANNER DE CUPOM & OCR (VISÃO IA) - 100% INDEPENDENTE */}
      <div className="space-y-4 rounded-2xl border border-purple-500/40 bg-purple-950/15 p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-purple-500/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <Camera className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wide flex items-center gap-2">
                <span>2. Provedor de Visão / Scanner de Cupom & QR Code (OCR)</span>
                <span className="chip px-1.5 py-0 text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/40 font-mono">
                  100% Independente do Chat
                </span>
              </h4>
              <p className="text-[11px] text-zinc-400">
                Usado para fotografar cupons fiscais e preencher despesas/despensa com IA multimodal.
              </p>
            </div>
          </div>
        </div>

        {/* Tip showing independence from Chat */}
        <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-purple-100">
              Combinação Ideal: Groq para o Chat + OpenRouter ou NVIDIA para o Scanner!
            </p>
            <p className="text-[11px] text-purple-300/80">
              A Groq descontinuou o suporte a imagens/visão. Com esta divisão, você pode usar a <strong>Groq</strong> no Chat acima para conversas ultra-rápidas e gratuitas, e usar <strong>OpenRouter (Gemini Flash)</strong> ou <strong>NVIDIA (Llama 3.2 Vision)</strong> aqui para ler suas fotos sem nenhum erro!
            </p>
          </div>
        </div>

        {/* Vision Provider Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Selecione o Provedor de Visão:</label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {VISION_PROVIDERS.map((vId) => {
              const p = PROVIDERS[vId]
              const isSelected = activeVisionProvider === vId
              const isOpenRouter = vId === 'openrouter'
              const isNvidia = vId === 'nvidia'
              return (
                <button
                  key={vId}
                  type="button"
                  onClick={() => {
                    updateConfig({
                      visionProvider: vId,
                      visionModel: p.defaultVisionModel,
                    })
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/15 ring-1 ring-purple-500/30'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-xs text-zinc-100">{p.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-purple-400" />}
                  </div>
                  {isOpenRouter && (
                    <span className="mt-1 text-[10px] text-emerald-400 font-medium">
                      ⭐ Recomendado (Gemini 2.0 Flash / Mais Preciso)
                    </span>
                  )}
                  {isNvidia && (
                    <span className="mt-1 text-[10px] text-indigo-400 font-medium">
                      ⚡ Meta Llama 3.2 11B Vision
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Vision API Key Input */}
        {activeVisionProvider !== 'vps' && (
          <div className="space-y-2 p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/30">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-xs font-semibold text-purple-200 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-purple-400" />
                <span>Chave de API de Visão ({currentVisionProvider.name})</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText()
                      if (text) {
                        handleVisionApiKeyChange(text.trim())
                        toast.success('Chave de visão colada com sucesso! 📋')
                      }
                    } catch {
                      toast.info('Cole sua chave diretamente no campo abaixo.')
                    }
                  }}
                  className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-1 bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  <span>Colar</span>
                </button>
                {currentVisionProvider.docsUrl && (
                  <a
                    href={currentVisionProvider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                  >
                    Obter chave <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Same key info if matching chat provider */}
            {activeVisionProvider === config.provider && activeChatApiKey ? (
              <p className="text-[11px] text-purple-300/80">
                ✓ Usando a mesma chave configurada na Seção 1 acima (ou você pode alterá-la abaixo):
              </p>
            ) : null}

            <div className="relative">
              <input
                type={showVisionKey ? 'text' : 'password'}
                placeholder={
                  activeVisionProvider === 'google'
                    ? 'AIzaSy... (Chave Grátis Google AI Studio)'
                    : activeVisionProvider === 'openrouter'
                      ? 'sk-or-v1-...'
                    : activeVisionProvider === 'nvidia'
                      ? 'nvapi-...'
                      : 'sk-...'
                }
                value={activeVisionApiKey}
                onChange={(e) => handleVisionApiKeyChange(e.target.value)}
                className="input-base pr-20 font-mono text-xs py-2.5 border-purple-500/30 focus:border-purple-400"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-zinc-400">
                <button
                  type="button"
                  onClick={() => setShowVisionKey(!showVisionKey)}
                  className="p-1 hover:text-zinc-200"
                  title={showVisionKey ? 'Ocultar chave' : 'Mostrar chave'}
                >
                  {showVisionKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-zinc-500" />}
                </button>
              </div>
            </div>

            {/* Dedicated Test Vision Button - 100% Mobile Responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-purple-500/20">
              <div className="flex items-center gap-1.5 min-h-[22px]">
                {visionStatus === 'success' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <Check className="h-3.5 w-3.5 shrink-0" /> Visão Operacional {visionLatency ? `(${visionLatency}ms)` : ''}
                  </span>
                )}
                {visionStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Falha no scanner
                  </span>
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleTestVisionModel}
                disabled={testingVision || !activeVisionApiKey}
                className="w-full sm:w-auto text-xs h-8 sm:h-7 px-3 gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md shadow-purple-900/30 justify-center shrink-0"
              >
                {testingVision ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5 text-purple-200" />}
                <span>Testar Visão (OCR)</span>
              </Button>
            </div>

            {visionMessage && (
              <p className={`text-[11px] p-2 rounded-lg border ${
                visionStatus === 'success'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}>
                {visionMessage}
              </p>
            )}
          </div>
        )}

        {/* Vision Model Selector */}
        <div className="space-y-1.5 p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/30">
          <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-purple-400" /> Modelo de Visão Ativo ({currentVisionProvider.name})
          </label>

          <select
            value={normalizedVisionModel}
            onChange={(e) => updateConfig({ visionModel: e.target.value })}
            className="input-base text-xs font-mono border-purple-500/30 focus:border-purple-400"
          >
            {visionPresetModels.map((m) => (
              <option key={m.id} value={m.id}>
                📸 {m.id} {m.name !== m.id ? `(${m.name})` : ''}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-zinc-400">
            Modelo multimodal que receberá a foto do cupom para ler data, valor, estabelecimento e itens.
          </p>
        </div>
      </div>

      {/* SEÇÃO 3: GROQ WHISPER TRANSCRIÇÃO DE ÁUDIO */}
      <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Mic className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                3. Transcrição por Voz com IA (Groq Whisper)
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
              <Check className="h-3.5 w-3.5" /> Usando a mesma chave Groq configurada na Seção 1
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

      {/* SEÇÃO 4: VPS & CLOUDFLARE TUNNEL */}
      <div className="space-y-4 border-t border-zinc-800 pt-4">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-cyan-400" />
          4. Sua VPS Hermes (Cloudflare Tunnel & Webhook)
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

      {/* SEÇÃO 5: VOZ DO HERMES */}
      <div className="space-y-3 border-t border-zinc-800 pt-4">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
          <Mic className="h-3.5 w-3.5 text-purple-400" />
          5. Voz do Hermes (Locução & Leitura por Voz)
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
              'Testar Chat Completo com Hermes'
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
          <p className="text-xs text-zinc-300 whitespace-pre-wrap">{testMessage}</p>
        </div>
      )}
    </Card>
  )
}
