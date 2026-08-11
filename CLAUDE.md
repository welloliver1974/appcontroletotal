# AppControleTotal — Life OS Hub

Sistema Operacional Pessoal em PWA (dark mode premium, estilo Linear.app/Vercel) com 7 módulos. Frontend React + Tailwind com **backend simulado (mock)** via `localStorage` + API fake assíncrona.

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
  features/     # um diretório por módulo: dashboard, life-log, manutencao, despensa, viagens, ingles, agenda
  data/         # "backend mock": db.ts (localStorage), api.ts (async fake), seed.ts, neural.ts (busca), types.ts
  stores/       # zustand: uiStore (palette/modais), authStore (trusted device)
  lib/          # modules.ts (registry dos 7 módulos), utils.ts (cn, fuzzy, datas)
  styles/       # index.css (Tailwind v4 + design tokens + glassmorphism)
```

## Design system ("dark com vida")

- **Tipografia**: `--font-display` = **Space Grotesk** (títulos `h1–h5` e números em destaque) · `--font-sans` = **Inter** (corpo/UI) · `--font-mono` = mono de sistema + `.font-num` (dados, datas, preços, tabular).
- **Dark nativo com vida**: fundo `zinc-950` + glows ambientes fixos (indigo topo / cyan direita / rose canto) no `body`; cards `zinc-900` com inset top-highlight (`inset 0 1px 0 white/0.04`).
- **Primária = indigo-500**: botões primários (`Button` variant `primary`), botão "+" do header, foco do omnibox/inputs, destaques da command palette. Marca em gradiente **indigo→violet**.
- **Accents por módulo** (classes literais no registry `src/lib/modules.ts` — Tailwind não compila dinâmico): Dashboard → violet · Life-Log → emerald · Manutenção → orange · Despensa → purple · Viagens → cyan · Inglês → blue · Agenda → rose. Cada módulo tem `text` (-400), `solid` (-500), `soft` (chip /15), `glow` (bg tingido `/10` do item ativo na navegação) e `gradient`.
- **Responsivo**: mobile <768px (BottomNav glass + `env(safe-area-inset)`), tablet 768–1024 (NavRail + grids 2 col), desktop ≥1024 (Sidebar).
- Classes utilitárias em `src/styles/index.css`: `.card`, `.glass`, `.chip`, `.btn-ghost`, `.input-base`, `.skeleton`, `.pulse-dot`, `.eyebrow`, `.text-gradient` (indigo→violet→cyan), `.font-num`, `@keyframes shake`.

## Convenções

- **Código/comentários em inglês** · **Textos de UI em PT-BR**.
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
| 5 | ⏭️ | Viagens & Experiências |
| 6 | ⏭️ | Inglês B1 (Sala de Aula) |
| 7 | ⏭️ | Agenda & Inbox (Hermes Bridge) |
| 8 | ⏭️ | Backup, Webhook e PWA (offline) |

## Governança de fases

**Regra do usuário:** toda fase/módulo termina com parada de revisão e **só avançamos após o OK explícito do usuário** — nunca automaticamente.

## Validação

- `npm run build` limpo (TS strict + bundle).
- Revisão visual responsiva nas 3 larguras via DevTools (mobile/tablet/desktop).
- Atalhos: `⌘/Ctrl+K` omnibox · `⌘/Ctrl+N` adição rápida · `Alt+1..7` troca de módulo.
- Fluxo Emergency Gate na 1ª abertura (código demo `2468`), persiste dispositivo confiável.
