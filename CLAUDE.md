# AppControleTotal — Life OS Hub

Sistema Operacional Pessoal em PWA (dark mode premium, estilo Linear.app/Vercel) com 6 módulos. Frontend React + Tailwind com **backend simulado (mock)** via `localStorage` + API fake assíncrona.

O PRD completo está em [PRD.md](PRD.md).

## Stack

- Vite 8 · React 19 · TypeScript (strict) · alias `@/` → `src/`
- Tailwind CSS v4 (plugin `@tailwindcss/vite`)
- React Router v7 (SPA) · Zustand (estado global + persistência) · Recharts (Life Insights) · lucide-react (ícones)

## Comandos

```bash
npm run dev      # dev server (Vite)
npm run build    # tsc -b + vite build (validação de tipos + produção)
npm run lint     # oxlint
npm run preview  # serve o build de produção
```

## Estrutura

```
src/
  app/          # App.tsx (router + Emergency Gate) 
  components/
    layout/     # AppShell, Sidebar (desktop), NavRail (tablet), BottomNav (mobile), Header, Omnibox/CommandPalette, QuickAdd
    ui/         # primitivas: Card, Modal, Button, KpiCard, Skeleton/EmptyState, PageHeader, IconTile, Badge
    auth/       # EmergencyGate
  features/     # um diretório por módulo: dashboard, life-log, manutencao, despensa, viagens, agenda
  data/         # "backend mock": db.ts (localStorage), api.ts (async fake), seed.ts, neural.ts (busca), types.ts
  stores/       # zustand: uiStore (palette/modais), authStore (trusted device), toastStore, backupStore, offlineQueueStore
  lib/          # modules.ts (registry dos 6 módulos), utils.ts (cn, fuzzy, datas), pwa.ts, safeApi.ts (mock async + fallback offline), backgroundSync.ts, backupScheduler.ts, usePendingDelete.ts
  styles/       # index.css (Tailwind v4 + design tokens + glassmorphism)
```

## Design system ("dark com vida")

- **Tipografia**: `--font-display` = **Space Grotesk** (títulos `h1–h5` e números em destaque) · `--font-sans` = **Inter** (corpo/UI) · `--font-mono` = mono de sistema + `.font-num` (dados, datas, preços, tabular).
- **Dark nativo com vida**: fundo `zinc-950` + glows ambientes fixos (indigo topo / cyan direita / rose canto) no `body`; cards `zinc-900` com inset top-highlight (`inset 0 1px 0 white/0.04`).
- **Primária = indigo-500**: botões primários (`Button` variant `primary`), botão "+" do header, foco do omnibox/inputs, destaques da command palette. Marca em gradiente **indigo→violet**.
- **Accents por módulo** (classes literais no registry `src/lib/modules.ts` — Tailwind não compila dinâmico): Dashboard → violet · Life-Log → emerald · Manutenção → orange · Despensa → purple · Viagens → cyan · Agenda → rose. Cada módulo tem `text` (-400), `solid` (-500), `soft` (chip /15), `glow` (bg tingido `/10` do item ativo na navegação) e `gradient`.
- **Responsivo**: mobile <768px (BottomNav glass + `env(safe-area-inset)`), tablet 768–1024 (NavRail + grids 2 col), desktop ≥1024 (Sidebar).
- Classes utilitárias em `src/styles/index.css`: `.card`, `.glass`, `.chip`, `.btn-ghost`, `.input-base`, `.skeleton`, `.pulse-dot`, `.eyebrow`, `.text-gradient` (indigo→violet→cyan), `.font-num`, `@keyframes shake`.

## Convenções

- **Código/comentários em português** · **Textos de UI em PT-BR**.
- Tipos compartilhados em `src/data/types.ts` (collections de cada módulo).
- Cada página de módulo vive em `src/features/<id>/<Id>Page.tsx` e é substituída a cada fase.
- Mocks: seeds em `src/data/seed.ts` (semear via `db.init()` na primeira carga); re-seed manual limpa `localStorage` (`act.*`).

## Roadmap (fases)

| Fase | Status | Entrega |
|---|---|---|
| 0 | ✅ | Fundação: design system, nav responsiva, header + omnibox, Emergency Gate, rotas, mock layer, docs |
| 0.5 | ✅ | Refresh visual: Space Grotesk + Inter, indigo primário, dark "com vida" (glows/highlight), accents vivos + glow |
| 1 | ⏭️ | Dashboard (KPIs, alertas, agenda, emails, Life Insights) |
| 2 | ⏭️ | Life-Log & Leitura |
| 3 | ⏭️ | Manutenção & Ativos |
| 4 | ⏭️ | Consumo & Despensa |
| 5 | ✅ | Viagens & Experiências (itinerário cronológico + locais salvos) |
| 6 | ✅ | **Removido — Inglês B1** (módulo não prossegui) |
| 7 | ✅ | Agenda & Inbox (Hermes Bridge) — CalendarView, EventModal, EmailCard, Settings (Backup/Webhook/PWA) |
| 8 | ✅ | Backup, Webhook e PWA (offline) — `backupStore`, `offlineQueueStore`, `safeApi`, `backgroundSync`, `backupScheduler`, `ToastContainer` |

## Governança de fases

**Regra do usuário:** toda fase/módulo termina com parada de revisão e **só avançamos após o OK explícito do usuário** — nunca automaticamente.

### Fase 8 — Backup, Webhook e PWA (offline) ✅

- **Persistência local resiliente:** `offlineQueueStore` enfileira ações offline e replays quando a conexão retorna; `backgroundSync.ts` detecta estado de rede (`navigator.onLine`) e aciona flush.
- **API segura:** `safeApi.ts` envolve o mock async com fallback automático para a fila offline em caso de erro.
- **Backup & restore:** `backupStore` (persistência de schedule) + `backupScheduler.ts` (export/import JSON + backup automático semanal/ periódico via `visibilitychange` + `focus`).
- **Webhook mock:** payload JSON POST para endpoint configurado, com assinatura HMAC opcional (`X-Hermes-Signature`) e teste com inspeção de resposta via UI de agenda.
- **PWA offline:** service worker (vite-plugin-pwa) pré-cacheia assets + shell + runtime caching (fonts, `/api/*`); `pwa.ts` utilitários para registro e lifecycle; `registerServiceWorker()` chamado em `main.tsx` em produção.
- **Feedback:** `ToastContainer.tsx` renderiza toasts de sucesso/erro/alerta (backup concluído, sincronização offline, etc.).

## Validação

- `npm run build` limpo (TS strict + bundle).
- Revisão visual responsiva nas 3 larguras via DevTools (mobile/tablet/desktop).
- Atalhos: `⌘/Ctrl+K` omnibox · `⌘/Ctrl+N` adição rápida · `Alt+1..6` troca de módulo.
- Fluxo Emergency Gate na 1ª abertura (código demo `2468`), persiste dispositivo confiável.
