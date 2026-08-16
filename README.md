# AppControleTotal — Life OS Hub

> **Sistema Operacional Pessoal** — PWA dark mode premium (estilo Linear.app/Vercel) com 6 módulos. Frontend React 19 + Tailwind CSS v4, backend simulado (mock) via `localStorage` + API fake assíncrona. Supabase/PostgreSQL opcional com fallback automático.

---

## 🚀 Quick Start

```bash
# Instala dependências
npm install

# Desenvolvimento (hot reload)
npm run dev          # http://localhost:5173

# Produção
npm run build        # valida tipos (tsc -b) + build Vite
npm run preview      # serve o build de produção

# Lint
npm run lint         # oxlint
```

> **Primeira abertura:** Emergency Mode pede código de verificação. Use `2468` (demo). Dispositivo fica "confiável" após 1ª vez.

---

## 📦 Módulos (6 ativos — **todos concluídos**)

| Módulo | Ícone | Descrição | Status |
|--------|-------|-----------|--------|
| Dashboard | 📊 | KPIs, alertas, agenda, emails, Life Insights (gráficos Recharts) | ✅ Concluído (Fase 1) |
| Life-Log & Leitura | 📝 | Diário, leitura, cofre de fatos, captura YouTube/Instagram, índice neural | ✅ Concluído (Fase 2) |
| Manutenção & Ativos | 🛠️ | Veículos/Casa, barras de vida útil, histórico de intervenções | ✅ Concluído (Fase 3) |
| Consumo & Despensa | 🛒 | Estoque visual, CRUD, exportação lista via webhook | ✅ Concluído (Fase 4) |
| Viagens & Experiências | ✈️ | Itinerário cronológico, locais salvos (bucket list) | ✅ Concluído (Fase 5) |
| Agenda & Inbox | 📅 | CalendarView, EventModal, EmailCard, Settings (Backup/Webhook/PWA) | ✅ Concluído (Fase 7) |

> **Nota:** Fase 6 (Inglês B1) foi removida por decisão de produto.

---

## 🎨 Design System ("Dark com Vida")

- **Tipografia:** Space Grotesk (títulos/números) + Inter (corpo/UI) + mono (dados tabulares)
- **Cores base:** Fundo `zinc-950` · Cards `zinc-900` com inset highlight (`white/0.04`) · Bordas `zinc-800`
- **Primária:** `indigo-500` (ações, foco, marca em gradiente `indigo→violet`)
- **Accents por módulo** (classes literais em `src/lib/modules.ts`):
  - Dashboard → `violet` · Life-Log → `emerald` · Manutenção → `orange`
  - Despensa → `purple` · Viagens → `cyan` · Agenda → `rose`
- **Glows ambientes** fixos no `body` (indigo topo / cyan direita / rose canto)
- **Responsivo nativo:**
  - Mobile < 768px: BottomNav glass + `env(safe-area-inset)`
  - Tablet 768–1024px: NavRail + grids 2 col
  - Desktop ≥ 1024px: Sidebar expansível + grids alta densidade

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Cmd/Ctrl + K` | Foca Omnibox (busca neural) |
| `Cmd/Ctrl + N` | Modal de adição rápida global |
| `Alt + 1..6` | Navegação instantânea entre módulos |

---

## 🔐 Emergency Gate (Segurança)

- Na 1ª abertura em dispositivo não confiável → solicita PIN via Hermes Agent (WhatsApp/Telegram)
- Código demo: **`2468`**
- Dispositivo confiável persiste em `localStorage` (`authStore`)

---

## 🗄️ Banco de Dados (Supabase/PostgreSQL — Opcional)

O app funciona **100% offline** com mock `localStorage`. Para usar Supabase:

```bash
# 1. Configure variáveis
cp .env.example .env.local
# edite .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 2. Aplique migrations
npm run supabase:push

# 3. (Opcional) Seed data
# Já incluído na migration 20260816000001_seed_data.sql
```

**Schema:** 14 tabelas (events, emails, life_log, facts, reading, media, assets, maintenance, pantry, trips, trip_stops, places, spending, maint_months) — detalhes em `DATABASE.md`.

---

## 📴 PWA / Offline (Fase 8 ✅)

- **Service Worker** (vite-plugin-pwa): pré-cache assets + shell + runtime caching
  - `StaleWhileRevalidate`: Google Fonts
  - `CacheFirst`: gstatic
  - `NetworkFirst`: `/api/*`
- **Offline Queue** (`offlineQueueStore` + `safeApi.ts`): enfileira mutações offline, replay automático ao voltar online
- **Background Sync** (`backgroundSync.ts`): BroadcastChannel + listeners `online/offline`
- **Backup Automático** (`backupStore` + `backupScheduler.ts`): export/import JSON, agendamento semanal persistido, checagem em `visibilitychange` + `focus`
- **Webhook Mock** (Settings → Webhook): POST JSON + HMAC opcional (`X-Hermes-Signature`)
- **Toast Notifications** (`ToastContainer`): sucesso/erro/alerta via portal em `App.tsx`

---

## 🤖 Hermes Agent (Integração Futura)

Estrutura preparada (mock funcional agora, real em fase futura):
- **Emergency Mode:** PIN via WhatsApp/Telegram
- **Webhook Capture:** `/api/webhook/hermes-capture` recebe links YouTube/Instagram, processa com IA, salva no Life-Log
- **Web Share Target:** PWA aparece no menu "Compartilhar" nativo do celular
- **Backup Sync:** Upload automático para Google Drive/Dropbox (quando credenciais configuradas)

---

## 📁 Estrutura do Projeto

```
src/
  app/                    # App.tsx (router + Emergency Gate)
  components/
    layout/               # AppShell, Sidebar, NavRail, BottomNav, Header, CommandPalette, QuickAdd
    ui/                   # Card, Modal, Button, KpiCard, Skeleton, EmptyState, PageHeader, IconTile, Badge, ToastContainer
    auth/                 # EmergencyGate
  features/               # Um diretório por módulo
    dashboard/
    life-log/
    manutencao/
    despensa/
    viagens/
    agenda/
  data/                   # "Backend mock"
    db.ts                 # localStorage mock (síncrono)
    api.ts                # API fake assíncrona (delay + jitter)
    seed.ts               # Dados iniciais (PT-BR)
    neural.ts             # Busca semântica mock (fuzzy + tags)
    types.ts              # Tipos compartilhados (collections de cada módulo)
  stores/                 # Zustand (persistência localStorage)
    uiStore, authStore, toastStore, backupStore, offlineQueueStore
  lib/                    # Utilitários centrais
    modules.ts            # Registry dos 6 módulos (cores, ícones, rotas)
    utils.ts              # cn, fuzzy, datas (todayStr, daysUntil, isoOffset, shortDate, relativeDayLabel)
    db.ts                 # Adapter async (Supabase + fallback localStorage)  ← NOVO
    pwa.ts                # Registro/lifecycle Service Worker
    safeApi.ts            # Wrapper mock async + fallback offline queue
    backgroundSync.ts     # Sync cross-tab via BroadcastChannel
    backupScheduler.ts    # Backup automático semanal (JSON)
    usePendingDelete.ts   # Guard para delete pendente
  styles/
    index.css             # Tailwind v4 + design tokens + glassmorphism + animações
```

---

## 🛠️ Stack

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Vite | 8 | Build tool + dev server |
| React | 19 | UI library |
| TypeScript | strict | Tipagem (alias `@/` → `src/`) |
| Tailwind CSS | v4 | Styling (plugin `@tailwindcss/vite`) |
| React Router | v7 | SPA routing |
| Zustand | 5 | Estado global + persistência |
| Recharts | 3 | Gráficos (Life Insights) |
| lucide-react | 1.31 | Ícones |
| @supabase/supabase-js | 2 | Client Supabase (opcional) |
| vite-plugin-pwa | 1.3 | PWA + Workbox |

---

## 📋 Roadmap & Governança

| Fase | Status | Entrega |
|------|--------|---------|
| 0 | ✅ | Fundação: design system, nav responsiva, header+omnibox, Emergency Gate, rotas, mock layer |
| 0.5 | ✅ | Refresh visual: Space Grotesk+Inter, indigo primário, dark "com vida", glows, accents |
| 1 | ✅ | **Dashboard** (KPIs, alertas, agenda, emails, Life Insights Recharts) |
| 2 | ✅ | **Life-Log & Leitura** (diário, leitura, cofre, captura YT/IG, índice neural) |
| 3 | ✅ | **Manutenção & Ativos** (CRUD, vida útil, histórico) |
| 4 | ✅ | **Consumo & Despensa** (estoque, CRUD, webhook mock) |
| 5 | ✅ | **Viagens & Experiências** (itinerário cronológico + locais salvos) |
| 6 | ❌ | **Removido** — Inglês B1 (não prossegue) |
| 7 | ✅ | **Agenda & Inbox** (Hermes Bridge) — CalendarView, EventModal, EmailCard, Settings |
| 8 | ✅ | **Backup, Webhook & PWA Offline** — backup semanal, offline queue, toast, SW runtime caching |

> **Regra de governança:** Toda fase termina com parada de revisão. Só avançamos após **OK explícito do usuário** — nunca automaticamente.

> **🎉 Todas as 9 fases (0, 0.5, 1–5, 7–8) implementadas e aprovadas.** App completo e em produção.

---

## 📄 Documentação

- `CLAUDE.md` — Instruções técnicas, convenções, stack, roadmap (referência do Claude Code)
- `PRD.md` — Product Requirements Document completo
- `DATABASE.md` — Schema SQL, migrations, adapter Supabase + fallback

---

## 🔧 Scripts Úteis

```bash
npm run dev              # Dev server
npm run build            # Type-check + production build
npm run lint             # Oxlint
npm run preview          # Serve production build
npm run supabase:push    # Aplica migrations no Supabase
npm run supabase:reset   # Reset DB local (docker)
```

---

## 📝 Licença

Uso pessoal — Life OS Hub.