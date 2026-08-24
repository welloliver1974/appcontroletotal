import { useState } from 'react'
import {
  Bot,
  Car,
  ChevronDown,
  ChevronRight,
  Compass,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface UserManualModalProps {
  open: boolean
  onClose: () => void
}

interface ManualSection {
  id: string
  title: string
  icon: typeof Zap
  color: string
  badge: string
  content: Array<{ subtitle: string; text: string; tip?: string }>
}

const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'dashboard-quick',
    title: 'Ações Rápidas & Biometria',
    icon: Zap,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    badge: 'Produtividade',
    content: [
      {
        subtitle: '⚡ Lançamentos em 1 Toque na Dashboard',
        text: 'Use a barra superior da Dashboard para registrar gastos (💸), escanear cupons (🧾), gravar voz (🎙️), agendar compromissos (📅) ou registrar abastecimento (⛽) sem precisar navegar pelos menus.',
        tip: 'No computador, use o atalho Cmd+K / Ctrl+K para abrir a Busca Neural e navegar instantaneamente.',
      },
      {
        subtitle: '🔐 Biometria no Celular (Face ID / Digital)',
        text: 'No smartphone, acesse Configurações ➔ Minha Conta ➔ Ativar Biometria. Na próxima vez que abrir o app, 1 toque no sensor de digital libera o Life OS Hub instantaneamente.',
      },
    ],
  },
  {
    id: 'scanner-ocr',
    title: 'Scanner de Cupom + Despensa',
    icon: Receipt,
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    badge: 'Visão com IA',
    content: [
      {
        subtitle: '📸 Como funciona o Scanner Inteligente',
        text: 'Tire uma foto de qualquer nota ou cupom fiscal (supermercado, farmácia, padaria, restaurante, posto). A IA de visão lê o valor total, data, estabelecimento e a lista de itens comprados.',
      },
      {
        subtitle: '🛒 Abastecimento Automático da Despensa',
        text: 'Na tela de confirmação, selecione os mantimentos encontrados e clique em "Lançar Gasto & Repor". O app lança a despesa em Finanças e soma as quantidades dos produtos diretamente no estoque da Despensa.',
        tip: 'Funciona com qualquer recibo impresso, sem depender de sites instáveis da SEFAZ.',
      },
    ],
  },
  {
    id: 'safe-to-spend',
    title: 'Safe-to-Spend & Conselheiro Financeiro',
    icon: Sparkles,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    badge: 'Preditivo',
    content: [
      {
        subtitle: '💡 Cota Diária Livre (Safe-to-Spend)',
        text: 'Calcula exatamente quanto você pode gastar por dia até o final do mês para não estourar o orçamento, dividindo a folga orçamentária pelos dias restantes.',
        tip: 'O indicador no Dashboard mostra se o seu ritmo está Confortável 🟢, em Atenção 🟡 ou Crítico 🔴.',
      },
      {
        subtitle: '🔥 Burn Rate Diário',
        text: 'Acompanhe a sua média diária real de gastos já realizada no mês e compare com a meta permitida.',
      },
    ],
  },
  {
    id: 'car-maint',
    title: 'Manutenção Preditiva & TCO por Km',
    icon: Car,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    badge: 'Automotivo',
    content: [
      {
        subtitle: '⛽ Registro de Abastecimento & Consumo Médio',
        text: 'Toda vez que abastecer, informe o odômetro (Km) do painel e os litros. O sistema calcula a média real (Km/L) e sincroniza automaticamente com Finanças.',
      },
      {
        subtitle: '🚗 TCO por Km (Custo Total de Posse)',
        text: 'O painel de desempenho calcula o custo consolidado de combustível + revisões e trocas de peças amortizadas por cada quilômetro rodado.',
      },
      {
        subtitle: '🔧 Previsão de Troca de Óleo',
        text: 'O algoritmo cruza sua média de Km/dia com o odômetro e calcula a estimativa da próxima revisão periódica.',
      },
    ],
  },
  {
    id: 'hermes-ai',
    title: 'Copiloto Hermes & "Pergunte ao Life OS"',
    icon: Bot,
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    badge: 'Inteligência Artificial',
    content: [
      {
        subtitle: '🤖 RAG Local Multi-Coleções',
        text: 'O Hermes tem acesso em tempo real às finanças do mês, cota de Safe-to-Spend, contas fixas pendentes, agenda dos próximos 3 dias, despensa, veículos e seguros.',
      },
      {
        subtitle: '💬 Exemplos de Perguntas',
        text: 'Experimente perguntar: "Quanto posso gastar hoje?", "Quais contas vencem essa semana?", "O que está faltando na despensa?" ou "Quando é a revisão do meu carro?".',
        tip: 'Você pode usar o botão de Microfone (🎙️) para falar em vez de digitar.',
      },
    ],
  },
  {
    id: 'trips-maps',
    title: 'Viagens & Smart Travel Assistant',
    icon: Compass,
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    badge: 'Viagens & Despesas',
    content: [
      {
        subtitle: '✈️ Piloto Automático de Viagens com IA',
        text: 'Clique no botão "IA Piloto ✈️" em qualquer viagem para ter um checklist inteligente de malas adaptado ao destino (praia, trabalho, família), estimativa de combustível baseada no Km/L do seu carro e envio direto para o Telegram.',
      },
      {
        subtitle: '🗺️ Importador da Linha do Tempo (Google Maps)',
        text: 'Em Viagens ➔ "Importar Google Maps", selecione o arquivo .json ou .kml da Linha do Tempo para gerar todo o itinerário e paradas automaticamente.',
      },
    ],
  },
  {
    id: 'pantry-shopping',
    title: 'Despensa, EAN-13 & Hermes Chef',
    icon: ShoppingBag,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    badge: 'Casa & Estoque',
    content: [
      {
        subtitle: '🏷️ Scanner de Código de Barras (OpenFoodFacts)',
        text: 'Aponte a câmera para o código de barras de qualquer produto de mercado. O app consulta a base global e preenche nome, marca, foto e validade estimada automaticamente.',
      },
      {
        subtitle: '👨‍🍳 Hermes Chef: O que cozinhar hoje?',
        text: 'Clique em Hermes Chef na despensa para a IA sugerir receitas deliciosas aproveitando os ingredientes que você já tem em casa e narrando o modo de preparo por áudio.',
      },
      {
        subtitle: '🛒 Modo Mercado Interativo',
        text: 'Abra a lista de compras em formato de checklist no celular e dê baixa nos produtos conforme coloca no carrinho.',
      },
    ],
  },
  {
    id: 'vault-security',
    title: 'Cofre de Documentos & Apólices',
    icon: ShieldCheck,
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    badge: 'Segurança',
    content: [
      {
        subtitle: '🔒 Cofre Pessoal Criptografado',
        text: 'Guarde apólices de seguro, números de assistência 24h, certidões e notas importantes em Life-Log ➔ Cofre de Documentos (DocVault).',
        tip: 'Funciona 100% offline, para você ter seus documentos mesmo sem sinal no celular.',
      },
    ],
  },
]

export function UserManualModal({ open, onClose }: UserManualModalProps) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string>('dashboard-quick')

  const filteredSections = MANUAL_SECTIONS.filter((sec) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      sec.title.toLowerCase().includes(q) ||
      sec.badge.toLowerCase().includes(q) ||
      sec.content.some((c) => c.subtitle.toLowerCase().includes(q) || c.text.toLowerCase().includes(q))
    )
  })

  return (
    <Modal open={open} onClose={onClose} title="Manual de Instruções & Guia de Uso 📖">
      <div className="space-y-4 pt-1">
        {/* Barra de Busca no Manual */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            className="input-base pl-9 text-xs"
            placeholder="Buscar ajuda (ex: scanner, carro, viagens, biometria, despensa)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Lista de Seções Accordion */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filteredSections.map((sec) => {
            const Icon = sec.icon
            const isExpanded = expandedId === sec.id

            return (
              <div
                key={sec.id}
                className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? '' : sec.id)}
                  className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${sec.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-zinc-100 truncate">{sec.title}</h4>
                        <span className="chip text-[9px] px-1.5 py-0.2 bg-zinc-800 text-zinc-400">
                          {sec.badge}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-zinc-500">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-cyan-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-3.5 pt-0 border-t border-zinc-800/60 space-y-3 bg-zinc-950/40">
                    {sec.content.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <h5 className="text-xs font-semibold text-cyan-300">{item.subtitle}</h5>
                        <p className="text-xs text-zinc-300 leading-relaxed">{item.text}</p>
                        {item.tip && (
                          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-200 mt-1 flex items-start gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                            <span>
                              <strong>Dica Pro:</strong> {item.tip}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs text-zinc-500">
          <span>Life OS Hub · v2.5 (2026)</span>
          <Button variant="primary" size="sm" onClick={onClose} className="text-xs">
            Entendido!
          </Button>
        </div>
      </div>
    </Modal>
  )
}
