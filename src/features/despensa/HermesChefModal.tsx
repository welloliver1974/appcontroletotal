import { useState } from 'react'
import {
  ChefHat,
  Clock,
  Copy,
  Loader2,
  Send,
  Sparkles,
  Square,
  Utensils,
  Volume2,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { PantryItem } from '@/data/types'
import { getHermesAdvancedConfig, sendDirectTelegramMessage } from '@/lib/hermes'
import {
  getVoiceGender,
  setVoiceGender,
  speakText,
  stopSpeaking,
  type VoiceGender,
} from '@/lib/speechSynthesis'
import { toast } from '@/stores/toastStore'

interface HermesChefModalProps {
  open: boolean
  onClose: () => void
  items: PantryItem[]
}

interface Recipe {
  title: string
  time: string
  difficulty: string
  servings: string
  ingredientsUsed: string[]
  missingIngredients?: string[]
  instructions: string[]
}

export function HermesChefModal({ open, onClose, items }: HermesChefModalProps) {
  const config = getHermesAdvancedConfig()

  // Itens disponíveis (estoque > 0)
  const availableItems = items.filter((i) => Number(i.qty) > 0)
  const expiringItems = availableItems.filter((i) => {
    if (!i.expiresAt) return false
    const diffDays = (new Date(i.expiresAt).getTime() - Date.now()) / 86400000
    return diffDays <= 7
  })

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [activeRecipeIndex, setActiveRecipeIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const [voiceGender, setGenderState] = useState<VoiceGender>(() => getVoiceGender())

  const toggleVoiceGender = () => {
    const next: VoiceGender = voiceGender === 'female' ? 'male' : 'female'
    setGenderState(next)
    setVoiceGender(next)
    toast.success(`Voz alterada para: ${next === 'female' ? 'Feminina 👩' : 'Masculina 👨'}`)

    if (isPlayingVoice && activeRecipe) {
      stopSpeaking()
      const narrationText = `Receita de ${activeRecipe.title}. Tempo de preparo: ${activeRecipe.time}. Nível ${activeRecipe.difficulty}. Ingredientes: ${activeRecipe.ingredientsUsed.join(', ')}. Modo de preparo: ${activeRecipe.instructions.join('. ')}`
      speakText(narrationText, {
        gender: next,
        onStart: () => setIsPlayingVoice(true),
        onEnd: () => setIsPlayingVoice(false),
        onError: () => setIsPlayingVoice(false),
      })
    }
  }

  const generateRecipes = async () => {
    if (availableItems.length === 0) {
      toast.info('Cadastre itens com estoque na sua despensa primeiro!')
      return
    }

    setLoading(true)
    stopSpeaking()
    setIsPlayingVoice(false)

    const availableNames = availableItems.map((i) => `${i.name} (${i.qty} ${i.unit})`).join(', ')
    const urgentNames = expiringItems.map((i) => i.name).join(', ')

    const groqKey =
      config.groqApiKey ||
      (config.provider === 'groq' ? config.llmApiKey : '') ||
      import.meta.env.VITE_GROQ_API_KEY ||
      ''
    const genericKey = config.llmApiKey || import.meta.env.VITE_LLM_API_KEY || ''
    const apiKey = groqKey || genericKey

    const systemPrompt = `Você é o HERMES CHEF, um chef executivo de culinária prática, saudável e deliciosa.
Sua missão é sugerir exatamente 3 receitas práticas para almoço ou jantar utilizando PRIORITARIAMENTE os ingredientes disponíveis na despensa do usuário.
Dê preferência para aproveitar os itens próximos da validade para evitar desperdício.

RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO no seguinte formato (sem markdown em volta do json se possível):
{
  "recipes": [
    {
      "title": "Nome Criativo da Receita",
      "time": "25 min",
      "difficulty": "Fácil",
      "servings": "2 porções",
      "ingredientsUsed": ["Item 1", "Item 2"],
      "missingIngredients": ["Sal", "Azeite"],
      "instructions": [
        "Passo 1...",
        "Passo 2...",
        "Passo 3..."
      ]
    }
  ]
}`

    const userPrompt = `ITENS DISPONÍVEIS NA MINHA DESPENSA:
${availableNames}

${urgentNames ? `ITENS COM VALIDADE PRÓXIMA (Priorizar se possível): ${urgentNames}` : ''}

Crie 3 receitas deliciosas e fáceis:`

    try {
      let endpoint = 'https://api.groq.com/openai/v1/chat/completions'
      let model = 'llama-3.3-70b-versatile'

      if (config.provider === 'openrouter' || apiKey.startsWith('sk-or-')) {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions'
        model = config.llmModel || 'meta-llama/llama-3.3-70b-instruct'
      } else if (config.provider === 'nvidia') {
        endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions'
        model = config.llmModel || 'meta/llama-3.3-70b-instruct'
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey || 'demo'}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
        }),
      })

      if (res.ok) {
        const json = await res.json()
        const rawContent = json.choices?.[0]?.message?.content || '{}'
        const parsed = JSON.parse(rawContent)
        if (parsed.recipes && Array.isArray(parsed.recipes) && parsed.recipes.length > 0) {
          setRecipes(parsed.recipes)
          setActiveRecipeIndex(0)
          toast.success('3 receitas preparadas pelo Hermes Chef! 👨‍🍳✨')
          return
        }
      }

      // Fallback inteligente caso offline ou resposta incompleta
      throw new Error('Fallback')
    } catch {
      // Fallback heurístico com os itens do usuário
      const primary = availableItems.slice(0, 3).map((i) => i.name)
      const fallbackRecipes: Recipe[] = [
        {
          title: `Refogado Rápido Especial de ${primary[0] || 'Despensa'}`,
          time: '20 min',
          difficulty: 'Fácil',
          servings: '2 pessoas',
          ingredientsUsed: primary,
          missingIngredients: ['Azeite', 'Alho', 'Sal e pimenta a gosto'],
          instructions: [
            'Aqueça uma frigideira com um fio de azeite e doure o alho.',
            `Adicione ${primary.join(' e ')} em fogo médio e refogue bem.`,
            'Tempere a gosto e finalize quando estiver macio e suculento. Sirva quente!',
          ],
        },
        {
          title: `Omelete Cremosa Recheada com ${primary[1] || primary[0] || 'Ingredientes da Casa'}`,
          time: '15 min',
          difficulty: 'Muito Fácil',
          servings: '1 a 2 pessoas',
          ingredientsUsed: primary.slice(0, 2),
          missingIngredients: ['2 a 3 Ovos', 'Manteiga ou azeite'],
          instructions: [
            'Bata os ovos com uma pitada de sal em uma tigela.',
            `Pique os ingredientes (${primary.slice(0, 2).join(', ')}) em pedaços pequenos.`,
            'Despeje na frigideira untada, adicione o recheio no centro e dobre ao dourar.',
          ],
        },
      ]
      setRecipes(fallbackRecipes)
      setActiveRecipeIndex(0)
      toast.success('Receitas práticas sugeridas com base no seu estoque! 🍳')
    } finally {
      setLoading(false)
    }
  }

  const activeRecipe = recipes[activeRecipeIndex]

  const formatRecipeText = (recipe: Recipe) => {
    return [
      `👨‍🍳 *HERMES CHEF — ${recipe.title.toUpperCase()}*`,
      `⏱️ *Tempo:* ${recipe.time} | 📊 *Nível:* ${recipe.difficulty} | 🍽️ *Rendimento:* ${recipe.servings}`,
      ``,
      `🛒 *Ingredientes da Despensa:*`,
      recipe.ingredientsUsed.map((i) => `• ${i}`).join('\n'),
      recipe.missingIngredients && recipe.missingIngredients.length > 0
        ? `\n🧂 *Temperos/Básicos Necessários:*\n${recipe.missingIngredients.map((i) => `• ${i}`).join('\n')}`
        : '',
      ``,
      `🔥 *Modo de Preparo:*`,
      recipe.instructions.map((step, idx) => `${idx + 1}. ${step}`).join('\n'),
      ``,
      `✨ _Sugerido com inteligência pelo Life OS Hub_`,
    ].join('\n')
  }

  const handleToggleVoice = () => {
    if (!activeRecipe) return

    if (isPlayingVoice) {
      stopSpeaking()
      setIsPlayingVoice(false)
      toast.info('Leitura pausada.')
      return
    }

    const narrationText = `Receita de ${activeRecipe.title}. Tempo de preparo: ${activeRecipe.time}. Nível ${activeRecipe.difficulty}. Ingredientes: ${activeRecipe.ingredientsUsed.join(', ')}. Modo de preparo: ${activeRecipe.instructions.join('. ')}`

    const ok = speakText(narrationText, {
      onStart: () => setIsPlayingVoice(true),
      onEnd: () => setIsPlayingVoice(false),
      onError: () => setIsPlayingVoice(false),
    })

    if (ok) {
      setIsPlayingVoice(true)
      toast.success('Hermes narrando o passo a passo da receita! 🎧')
    }
  }

  const handleSendTelegram = async () => {
    if (!activeRecipe) return
    const text = formatRecipeText(activeRecipe)

    const res = await sendDirectTelegramMessage(text)
    if (res.ok) {
      toast.success('Receita enviada direto para o seu Telegram! 📱✈️')
    } else {
      // Fallback link
      const url = `https://t.me/share/url?text=${encodeURIComponent(text)}`
      window.open(url, '_blank', 'noopener,noreferrer')
      toast.info('Abrindo Telegram para envio.')
    }
  }

  const handleCopy = async () => {
    if (!activeRecipe) return
    const text = formatRecipeText(activeRecipe)
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Receita copiada com sucesso! 📋')
    } catch {
      toast.info('Receita pronta.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="👨‍🍳 Hermes Chef: O que Cozinhar Hoje?">
      <div className="space-y-4 pt-1 text-zinc-200">
        {/* Banner de Estoque */}
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-zinc-900/60 to-orange-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <h4 className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
              <ChefHat className="h-4 w-4 text-amber-400" />
              <span>{availableItems.length} ingredientes disponíveis em estoque</span>
            </h4>
            <p className="text-[11px] text-zinc-400 truncate">
              {expiringItems.length > 0
                ? `⚠️ ${expiringItems.length} itens com validade próxima (${expiringItems.slice(0, 2).map((i) => i.name).join(', ')})`
                : 'A IA cria receitas práticas aproveitando ao máximo o que você já tem em casa.'}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={generateRecipes}
            disabled={loading}
            className="shrink-0 text-xs gap-1.5 bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{recipes.length > 0 ? 'Novas Ideias' : 'Sugerir Receitas'}</span>
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <ChefHat className="h-10 w-10 text-amber-400 animate-bounce" />
            <p className="text-xs font-medium text-zinc-300">
              O Hermes Chef está analisando seus ingredientes e elaborando receitas especiais...
            </p>
          </div>
        )}

        {/* Empty State inicial */}
        {!loading && recipes.length === 0 && (
          <div className="py-10 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <Utensils className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-100">Nenhuma receita gerada ainda</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Clique no botão <strong>"Sugerir Receitas"</strong> acima para a IA criar 3 opções sob medida com o que está na sua despensa.
              </p>
            </div>
          </div>
        )}

        {/* Receitas Geradas */}
        {!loading && recipes.length > 0 && activeRecipe && (
          <div className="space-y-3.5">
            {/* Tabs das 3 receitas */}
            <div className="flex gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
              {recipes.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveRecipeIndex(idx)
                    stopSpeaking()
                    setIsPlayingVoice(false)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeRecipeIndex === idx
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <span>Opção {idx + 1}:</span>
                  <span className="max-w-[140px] truncate">{r.title}</span>
                </button>
              ))}
            </div>

            {/* Card Detalhado da Receita Ativa */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                    <span>{activeRecipe.title}</span>
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-400" />
                      {activeRecipe.time}
                    </span>
                    <span>•</span>
                    <span>Nível: {activeRecipe.difficulty}</span>
                    <span>•</span>
                    <span>{activeRecipe.servings}</span>
                  </div>
                </div>

                {/* Botões de Ação na Receita */}
                <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                  {/* Botão Ouvir Voz Unificado com Toggle Integrado */}
                  <div
                    className={`inline-flex items-center rounded-lg border border-purple-500/30 bg-purple-500/10 transition-all overflow-hidden ${
                      isPlayingVoice ? 'bg-purple-500/20 border-purple-500/50 shadow-sm shadow-purple-500/20' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={handleToggleVoice}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-300 hover:text-purple-100 hover:bg-purple-500/20 transition-colors"
                      title={isPlayingVoice ? 'Parar leitura por voz' : `Ouvir passo a passo da receita (${voiceGender === 'female' ? 'Voz Feminina' : 'Voz Masculina'})`}
                    >
                      {isPlayingVoice ? (
                        <Square className="h-3 w-3 fill-current animate-pulse text-purple-300" />
                      ) : (
                        <Volume2 className="h-3 w-3 text-purple-300" />
                      )}
                      <span>{isPlayingVoice ? 'Parar' : 'Ouvir'}</span>
                    </button>

                    <div className="h-3 w-[1px] bg-purple-500/30" />

                    <button
                      type="button"
                      onClick={toggleVoiceGender}
                      className="flex items-center px-1.5 py-1 text-xs font-medium text-purple-300 hover:text-purple-100 hover:bg-purple-500/20 transition-colors"
                      title={`Alternar voz (Atual: ${voiceGender === 'female' ? 'Feminina 👩' : 'Masculina 👨'})`}
                    >
                      <span>{voiceGender === 'female' ? '👩' : '👨'}</span>
                    </button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSendTelegram}
                    className="text-xs text-sky-300 hover:bg-sky-500/10 border border-sky-500/30 gap-1 px-2.5 py-1"
                    title="Enviar receita completa para seu Telegram"
                  >
                    <Send className="h-3 w-3 text-sky-400" />
                    <span>Telegram</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="text-xs text-zinc-300 hover:bg-zinc-800 border border-zinc-700 gap-1 px-2 py-1"
                    title="Copiar receita"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Ingredientes Utilizados */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Utensils className="h-3.5 w-3.5 text-amber-400" />
                  Ingredientes Aproveitados da Despensa:
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeRecipe.ingredientsUsed.map((ing, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 border border-amber-500/30 text-amber-300"
                    >
                      ✓ {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ingredientes Básicos que podem faltar */}
              {activeRecipe.missingIngredients && activeRecipe.missingIngredients.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-semibold text-zinc-400">
                    Temperos & Básicos Recomendados:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRecipe.missingIngredients.map((ing, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800"
                      >
                        + {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Modo de Preparo */}
              <div className="space-y-2 pt-1 border-t border-zinc-900">
                <h4 className="text-xs font-semibold text-zinc-300">Modo de Preparo:</h4>
                <ol className="space-y-2 text-xs text-zinc-300">
                  {activeRecipe.instructions.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end border-t border-zinc-800">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
