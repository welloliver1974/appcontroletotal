# Life OS Hub — Sistema Operacional Pessoal & Hermes Agent

Sistema Operacional Pessoal em PWA (dark mode premium, estilo Linear.app/Vercel) com **6 módulos integrados com IA**. Frontend React 19 + Tailwind v4 com **backend híbrido** (Supabase/PostgreSQL em nuvem + fallback automático para `localStorage` offline).

O PRD completo está em [PRD.md](PRD.md) e o histórico detalhado de arquitetura está em [ARCHITECTURE_AND_HISTORY.md](ARCHITECTURE_AND_HISTORY.md).

## Stack

- Vite 8 · React 19 · TypeScript (strict) · alias `@/` → `src/`
- Tailwind CSS v4 (plugin `@tailwindcss/vite`)
- React Router v7 (SPA) · Zustand (estado global + persistência) · Recharts (Life Insights) · lucide-react (ícones)
- Supabase (PostgreSQL, Realtime sync, REST)
- Vercel Serverless Endpoints (`/api/webhook/hermes-capture`, `/api/calendar/sync-ical`, `/api/llm/proxy`)

## Comandos

```bash
npm run dev      # dev server (Vite)
npm run build    # tsc -b + vite build (validação de tipos + produção)
npm run lint     # oxlint (validação rápida de código)
npm run preview  # serve o build de produção localmente
npm run supabase:push   # aplica migrations no Supabase
npm run supabase:reset  # reseta DB local (docker)
```

## Estrutura

```
src/
  app/          # App.tsx (router + Emergency Gate + lazy loading) 
  components/
    layout/     # AppShell, Sidebar (desktop), NavRail (tablet), BottomNav (mobile), Header, Omnibox, QuickAdd
    ui/         # primitivas: Card, Modal, Button, KpiCard, Skeleton/EmptyState, PageHeader, Badge, ToastContainer, ProgressBar
    auth/       # EmergencyGate
    hermes/     # HermesChatDrawer (copiloto flutuante com suporte a voz)
  features/     # módulos: dashboard, life-log, manutencao, despensa, viagens, agenda
  data/         # "backend mock": db.ts (localStorage), api.ts (async fake), seed.ts, neural.ts (busca), types.ts
  stores/       # zustand: uiStore, authStore, toastStore, backupStore, offlineQueueStore, themeStore
  lib/          # modules.ts, utils.ts, pwa.ts, db.ts (adapter Supabase), ical.ts (parser RFC 5545), notifications.ts, llmProviders.ts, hermes.ts, hermesActions.ts, useRealtimeSync.ts
  styles/       # index.css (Tailwind v4 + design tokens + glassmorphism)
api/            # Vercel Serverless Functions
  webhook/      # hermes-capture.js (webhook de ingestão multi-entidade Telegram/Hermes)
  calendar/     # sync-ical.js (sincronização Google Calendar via iCal com RRULE)
  llm/          # proxy.js (proxy serverless para NVIDIA, Groq e OpenRouter sem CORS)
```

## Design system ("dark com vida")

- **Tipografia**: `--font-display` = **Space Grotesk** (títulos `h1–h5` e números em destaque) · `--font-sans` = **Inter** (corpo/UI) · `--font-mono` = mono de sistema + `.font-num` (dados, datas, preços, tabular).
- **Dark nativo com vida**: fundo `zinc-950` + glows ambientes fixos (indigo topo / cyan direita / rose canto) no `body`; cards `zinc-900` com inset top-highlight (`inset 0 1px 0 white/0.04`).
- **Primária = indigo-500**: botões primários (`Button` variant `primary`), botão "+" do header, foco do omnibox/inputs, destaques da command palette. Marca em gradiente **indigo→violet**.
- **Accents por módulo**: Dashboard → violet · Life-Log → emerald · Manutenção → orange · Despensa → purple · Viagens → cyan · Agenda → rose.
- **Responsivo em 3 níveis**:
  - **Mobile (<768px):** BottomNav glass + `env(safe-area-inset-bottom)` + layout em coluna única.
  - **Tablet (768–1024px):** NavRail compacto de 64px + grids de 2 colunas.
  - **Desktop (≥1024px):** Sidebar completa de 256px com atalhos de teclado + grids densos de 3 a 4 colunas.
- Classes utilitárias em `src/styles/index.css`: `.card`, `.glass`, `.chip`, `.btn-ghost`, `.input-base`, `.skeleton`, `.pulse-dot`, `.eyebrow`, `.text-gradient`, `.font-num`.

## Recursos Recentes Entregues

1. **Rebranding Life OS Hub:** Título, manifesto PWA, cabeçalho e menu lateral unificados.
2. **Despensa em Lista Compacta ([src/features/despensa/PantryListView.tsx](file:///e:/Apps/AppControleTotal/src/features/despensa/PantryListView.tsx)):**
   - Tabela densa com busca instantânea, abas de status (`Todos`, `🛒 Falta Comprar`, `⏳ Vencendo`) e filtros por categoria.
   - Steppers inline (`-` e `+`) para ajuste de estoque em 1 clique sem abrir modais.
3. **Modo Supermercado ([src/features/despensa/SupermarketModeModal.tsx](file:///e:/Apps/AppControleTotal/src/features/despensa/SupermarketModeModal.tsx)):**
   - Tela limpa com checkboxes grandes para usar no celular no mercado.
   - Barra de progresso visual do carrinho.
   - Botão para repor estoque de tudo o que foi comprado em 1 clique.
   - Envio da lista formatada com emojis direto para o Telegram do Hermes.
4. **Fluxo Bi-Direcional de Compras via Telegram ([api/webhook/hermes-capture.js](file:///e:/Apps/AppControleTotal/api/webhook/hermes-capture.js)):**
   - Ingestão de compras: `"preciso de coca zero e leite"` → adiciona com `qty: 0` na lista de compras.
   - Baixa de compras: `"comprei coca zero e leite"` ou `"repus 2 batatas"` → atualiza estoque no Supabase.
5. **Radar de Alertas Consolidado no Dashboard ([src/features/dashboard/Alerts.tsx](file:///e:/Apps/AppControleTotal/src/features/dashboard/Alerts.tsx)):**
   - Agrupa múltiplos itens em falta ou vencendo em 1 único card limpo.
6. **Lembretes Antecipados de Agenda (15 min antes) ([src/lib/notifications.ts](file:///e:/Apps/AppControleTotal/src/lib/notifications.ts)):**
   - Interval de checagem contínua notificando o usuário 15 minutos antes de compromissos da agenda.
7. **Proxy Serverless de LLMs & Resolução de CORS NVIDIA ([api/llm/proxy.js](file:///e:/Apps/AppControleTotal/api/llm/proxy.js)):**
   - Bypassa CORS na API da NVIDIA AI Foundation (`integrate.api.nvidia.com`), Groq e OpenRouter.
   - Lista curada com os melhores modelos da NVIDIA (`meta/llama-3.3-70b-instruct`, `deepseek-r1`, etc.) e fallback inteligente.
8. **Briefing Inteligente com IA no Dashboard ([src/features/dashboard/HermesBriefingCard.tsx](file:///e:/Apps/AppControleTotal/src/features/dashboard/HermesBriefingCard.tsx)):**
   - Síntese diária cruzando compromissos de hoje, compras pendentes e manutenções críticas.
9. **Sincronização de Combustível/Manutenção com Finanças & Orçamento ([src/lib/maintFinanceSync.ts](file:///e:/Apps/AppControleTotal/src/lib/maintFinanceSync.ts)):**
   - Lançamento automático de abastecimentos e manutenções na tabela de despesas (`spendingEntries`) e desconto imediato no orçamento da Dashboard.
   - Sincronizador retroativo de registros anteriores e flexibilização de ativos (`nextMaintenance` opcional, categorias: carro, moto, casa, outro).
10. **Índice de Bem-Estar / Humor no Life Insights ([src/features/dashboard/LifeInsights.tsx](file:///e:/Apps/AppControleTotal/src/features/dashboard/LifeInsights.tsx)):**
    - 3º card de tendência com curva de humor histórica (1 a 5) baseada no `lifeLog` / Voice Notes e emojis representativos.
11. **Modo Supermercado com Gestão de Custos & Sincronização com Finanças ([src/features/despensa/SupermarketModeModal.tsx](file:///e:/Apps/AppControleTotal/src/features/despensa/SupermarketModeModal.tsx)):**
    - Cálculo de total previsto vs. subtotal em tempo real do carrinho, ajuste inline de preços e lançamento automático do gasto nas despesas (`spendingEntries`).

## Validação

- `npm run build` limpo (TypeScript strict + Vite Rollup bundle).
- `npm run lint` 0 erros e 0 warnings.
- Layout 100% responsivo para Mobile, Tablet e Desktop.
- Deploy automatizado na Vercel conectado à branch `main`.