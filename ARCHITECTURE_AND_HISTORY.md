# AppControleTotal (Life OS Hub) — Arquitetura Completa & Memória de Desenvolvimento

> **Este documento contém o estado completo, histórico de decisões, arquitetura do sistema, esquema do banco de dados, integrações com IA (Hermes Agent / LLMs) e convenções de código para que qualquer Inteligência Artificial ou desenvolvedor possa compreender e continuar a evolução do projeto.**

---

## 📌 1. Visão Geral do Projeto

O **AppControleTotal (Life OS Hub)** é um Sistema Operacional Pessoal moderno no formato **PWA (Progressive Web App)** com interface *Dark Mode Premium* (estilo Linear.app, Vercel e Apple Human Interface Guidelines).

O app centraliza a gestão de 6 áreas da vida:
1. **📊 Dashboard:** KPIs consolidados, radar de alertas, próximos compromissos, emails urgentes, Life Insights (gráficos Recharts) e Briefing Matinal com IA.
2. **📝 Life-Log & Leitura:** Diário pessoal, rastreador de livros, cofre de anotações/fatos (*Fact Vault*), captura de mídias (YouTube & Instagram) e consulta semântica ao Hermes AI.
3. **🛠️ Manutenção & Ativos:** Gestão de patrimônio (veículos, residência, eletrônicos), barras de vida útil, odômetro e histórico de manutenções.
4. **🛒 Consumo & Despensa:** Controle de estoque de mantimentos, alertas de vencimento (≤ 3 dias), limite mínimo e exportação da lista de compras via Webhook direto para o Hermes / WhatsApp.
5. **✈️ Viagens & Experiências:** Roteiros cronológicos dia a dia e lista de locais salvos (*bucket list*).
6. **📅 Agenda & Inbox (Hermes Bridge):** Calendário mensal/semanal integrado com emails filtrados pelo Hermes e central de configurações avançadas.

---

## 🛠️ 2. Stack Tecnológica

* **Core & Build:** React 19, TypeScript 5 (strict mode), Vite 8 (`@tailwindcss/vite`).
* **Estilização:** Tailwind CSS v4 + Vanilla CSS moderno com tokens HSL, gradientes dinâmicos e *glassmorphism* em `src/styles/index.css`.
* **Roteamento:** React Router v7 (SPA) com *code splitting* via `React.lazy` e `Suspense`.
* **Gerenciamento de Estado:** Zustand (persistência local com `persist` middleware).
* **Banco de Dados Híbrido:**
  * **Nuvem:** Supabase PostgreSQL com **Realtime WebSockets** (`supabase-js`).
  * **Fallback Local:** `localStorage` mock adapter automático com fila offline e sincronização em background (`offlineQueueStore` + `backgroundSync.ts`).
* **Inteligência Artificial (Copiloto Hermes):**
  * Provedores suportados: **Groq**, **OpenRouter**, **NVIDIA AI Foundation**, **Sua VPS Hermes (Cloudflare Tunnel)** e endpoints OpenAI-compatíveis.
  * Busca dinâmica de modelos em tempo real (`GET /models`).
  * Execução de ações automáticas no Supabase (*Function Calling*).
  * Ditado por voz via **Web Speech API**.
* **PWA & Offline:** `vite-plugin-pwa`, Service Worker com pré-cache e Workbox runtime caching.
* **Linter & Qualidade:** Oxlint (configurado em `.oxlintrc.json`).

---

## 📁 3. Estrutura de Diretórios

```
e:/Apps/AppControleTotal/
├── public/                # Favicons, ícones do PWA e manifest
├── supabase/
│   ├── migrations/        # Migrações SQL versionadas (schema, RLS e compatibilidade)
│   └── config.toml        # Configurações do Supabase CLI
├── src/
│   ├── app/
│   │   └── App.tsx        # Router principal, lazy routes e Emergency Gate
│   ├── components/
│   │   ├── auth/          # EmergencyGate (autenticação por código)
│   │   ├── hermes/        # HermesChatDrawer.tsx (Chat flutuante com IA e voz)
│   │   ├── layout/        # AppShell, Header, Sidebar, NavRail, BottomNav, Omnibox, QuickAdd
│   │   └── ui/            # Primitivas: Button, Card, Modal, KpiCard, Skeleton, Toast, etc.
│   ├── data/
│   │   ├── api.ts         # Fake async API (para fallback local)
│   │   ├── db.ts          # LocalStorage mock driver
│   │   ├── neural.ts      # Motor de busca fuzzy/semântica local
│   │   ├── seed.ts        # Dados iniciais para demonstração offline
│   │   └── types.ts       # Modelos e interfaces TypeScript de todo o domínio
│   ├── features/
│   │   ├── agenda/        # AgendaPage, CalendarView, SettingsHermes, SettingsTheme, etc.
│   │   ├── dashboard/     # DashboardPage, HermesBriefingCard, KpiRow, LifeInsights, etc.
│   │   ├── despensa/      # DespensaPage, PantryItemCard, WebhookExport, etc.
│   │   ├── life-log/      # LifeLogPage, HermesAsk, LogsSection, ReadingSection, etc.
│   │   ├── manutencao/    # ManutencaoPage, AssetCard, RecordsSection, etc.
│   │   └── viagens/       # ViagensPage, TripCard, PlacesSection, etc.
│   ├── lib/
│   │   ├── backgroundSync.ts   # Sincronização em segundo plano da fila offline
│   │   ├── backupScheduler.ts  # Agendador de exportação e backup JSON
│   │   ├── db.ts               # Database Adapter unificado (Supabase + LocalStorage)
│   │   ├── hermes.ts           # Cliente central do Hermes Agent & LLMs
│   │   ├── hermesActions.ts    # Interpretador de ações automáticas no banco
│   │   ├── llmProviders.ts     # Configurações de provedores e busca de modelos
│   │   ├── modules.ts          # Registro e metadados dos 6 módulos
│   │   ├── notifications.ts    # Serviço de notificações nativas e PWA
│   │   ├── pwa.ts              # Utilitários de registro do Service Worker
│   │   ├── safeApi.ts          # Wrapper tolerante a falhas
│   │   ├── supabase.ts         # Inicialização do cliente Supabase
│   │   ├── usePendingDelete.ts # Hook com suporte a "desfazer" exclusões
│   │   ├── useRealtimeSync.ts  # Hook de escuta de canais Realtime do Supabase
│   │   └── utils.ts            # Funções utilitárias (cn, formatação de datas, etc.)
│   ├── stores/
│   │   ├── authStore.ts        # Estado do dispositivo confiável (Emergency Gate)
│   │   ├── backupStore.ts      # Configurações de agendamento de backup
│   │   ├── offlineQueueStore.ts# Fila de mutações offline pendentes
│   │   ├── themeStore.ts       # Seletor e persistência dos 4 temas visuais
│   │   ├── toastStore.ts       # Sistema de toasts de notificação
│   │   └── uiStore.ts          # Controle de modais, command palette e drawer
│   ├── styles/
│   │   └── index.css           # Estilos base, design tokens, temas e animações
│   └── main.tsx                # Ponto de entrada, inicialização de temas e serviços
├── vite.config.ts              # Configuração Vite, PWA e Rollup manualChunks
├── CLAUDE.md                   # Instruções de desenvolvimento e governança
├── PRD.md                      # Documento de Requisitos do Produto
└── ARCHITECTURE_AND_HISTORY.md # ESTE ARQUIVO (Memória de longo prazo)
```

---

## 🗄️ 4. Esquema do Banco de Dados (Supabase / PostgreSQL)

O Supabase está configurado com as seguintes tabelas principais:

| Tabela | Descrição | Campos Chave |
|---|---|---|
| `events` | Compromissos e reuniões | `id`, `title`, `date`, `time_start`, `time_end`, `category`, `location` |
| `emails` | Caixa de entrada inteligente | `id`, `from_address`, `subject`, `preview`, `importance`, `sent_at`, `tags`, `read` |
| `life_log` | Diário pessoal | `id`, `title`, `body`, `tags`, `mood`, `created_at` |
| `books` | Leituras e progresso | `id`, `title`, `author`, `status`, `current_page`, `total_pages`, `cover` |
| `facts` | Cofre de fatos e notas rápidas | `id`, `content`, `source`, `tags`, `created_at` |
| `media` | Mídias capturadas (YouTube/Insta) | `id`, `kind`, `url`, `title`, `source_label`, `summary`, `minutes`, `status`, `tags` |
| `assets` | Ativos (Carro/Casa/Equipamentos) | `id`, `name`, `type`, `total_life_months`, `used_months`, `icon` |
| `maintenance_records` | Histórico de serviços | `id`, `asset_id`, `description`, `cost`, `date`, `odometer_km` |
| `pantry` | Itens da despensa | `id`, `name`, `category`, `qty`, `unit`, `low_threshold`, `expires_at` |
| `trips` | Viagens planejadas | `id`, `destination`, `start_date`, `end_date`, `status` |
| `trip_stops` | Paradas do itinerário | `id`, `trip_id`, `day`, `time`, `title`, `note` |
| `places` | Locais salvos (Bucket list) | `id`, `name`, `where_location`, `visited`, `note` |
| `spending` | Registro de despesas | `id`, `amount`, `category`, `note`, `date` |

### Tratamento de Tipos e Nomenclatura:
O adapter [`src/lib/db.ts`](file:///e:/Apps/AppControleTotal/src/lib/db.ts) faz o mapeamento transparente entre `snake_case` do Postgres e `camelCase` do TypeScript:
- `time_start` ↔ `timeStart`
- `low_threshold` ↔ `lowThreshold`
- `created_at` ↔ `createdAt`
- `odometer_km` ↔ `odometerKm`

### 📋 Exemplos de Inserção SQL (Hermes Agent ➔ Supabase):

#### 1. Inserir Gasto / Despesa (`spending`):
```sql
INSERT INTO spending (id, amount, category, note, date)
VALUES (gen_random_uuid()::text, 45.50, 'Alimentação', 'Almoço com a equipe', '2026-08-17');
```

#### 2. Inserir Item na Despensa (`pantry`):
```sql
INSERT INTO pantry (id, name, category, qty, unit, low_threshold, expires_at)
VALUES (gen_random_uuid()::text, 'Café Torrado', 'alimentos', 2, 'un', 1, '2026-12-31');
```

#### 3. Inserir Compromisso na Agenda (`events`):
```sql
INSERT INTO events (id, title, date, time_start, time_end, category, location)
VALUES (gen_random_uuid()::text, 'Reunião de Alinhamento', '2026-08-18', '14:00', '15:00', 'reuniao', 'Google Meet');
```

#### 4. Inserir Nota no Diário / Life-Log (`life_log`):
```sql
INSERT INTO life_log (id, title, body, tags, mood, created_at)
VALUES (gen_random_uuid()::text, 'Reflexão do dia', 'Dia produtivo com ótimos avanços.', ARRAY['foco', 'trabalho'], 5, NOW());
```

---

## 🤖 5. Arquitetura do Hermes AI & LLM Engine

### Modos de Comunicação:
1. **VPS Própria com Cloudflare:**
   - URL do túnel: `https://hermes.seu-dominio.com`
   - Autenticação via `X-Hermes-Signature` e `Authorization: Bearer <token>`.
2. **Provedores Diretos de LLM:**
   - **Groq:** `https://api.groq.com/openai/v1` (Modelo recomendado: `llama-3.3-70b-versatile`).
   - **OpenRouter:** `https://openrouter.ai/api/v1` (Acesso a Llama, Claude, DeepSeek, Qwen).
   - **NVIDIA AI Foundation:** `https://integrate.api.nvidia.com/v1`.
   - **Endpoint Customizado:** Qualquer backend compatível com OpenAI.

### Funcionalidades de IA Implementadas:
- **Busca de Modelos Dinâmica ([llmProviders.ts](file:///e:/Apps/AppControleTotal/src/lib/llmProviders.ts)):** Ao inserir a API Key, o app busca a lista de modelos ativos da conta em tempo real via endpoint `/models`.
- **Chat Flutuante com Ditado por Voz ([HermesChatDrawer.tsx](file:///e:/Apps/AppControleTotal/src/components/hermes/HermesChatDrawer.tsx)):** Acessível de qualquer tela, com transcrição de voz (Web Speech API) e histórico de conversa.
- **Ações Automáticas / Function Calling ([hermesActions.ts](file:///e:/Apps/AppControleTotal/src/lib/hermesActions.ts)):** O Hermes pode responder ao usuário e executar inserções no Supabase anexando a tag:
  `ACTION: {"action": "pantry_add" | "spending_add" | "event_add" | "lifelog_add", "payload": {...}}`
- **Briefing Matinal no Dashboard ([HermesBriefingCard.tsx](file:///e:/Apps/AppControleTotal/src/features/dashboard/HermesBriefingCard.tsx)):** Gera um resumo inteligente dos compromissos e prioridades do dia.
- **Exportação da Despensa ([WebhookExport.tsx](file:///e:/Apps/AppControleTotal/src/features/despensa/WebhookExport.tsx)):** Envia a lista de compras gerada para o webhook do Hermes/WhatsApp com confirmação HTTP.

---

## 🎨 6. Sistema de Temas e Design

Configurável em **Configurações ➔ Temas & Visual** ([`themeStore.ts`](file:///e:/Apps/AppControleTotal/src/stores/themeStore.ts)):
1. 🌌 **Midnight Indigo** (Padrão): Tons de índigo profundo, roxo e ciano.
2. ⚡ **Emerald Cyberpunk:** Tons de esmeralda, verde neon e alto contraste.
3. 🖤 **Obsidian Minimal:** Carbono puro e vidro fosco elegante.
4. 🌹 **Rose Gold:** Quartzo rosa, âmbar e acentos acolhedores.

Os temas definem o atributo `data-theme` na tag `<html>` e acionam gradientes ambientes no `index.css`.

---

## 🔔 7. Sistema de Notificações Nativas (PWA / Navegador)

Implementado em [`src/lib/notifications.ts`](file:///e:/Apps/AppControleTotal/src/lib/notifications.ts):
- Solicitação de permissão nativa em 1 clique em **Configurações ➔ Notificações**.
- Disparo de notificações via Service Worker ou Notification API para:
  - Alimentos próximos da data de validade (≤ 3 dias).
  - Compromissos da Agenda para o dia de hoje.
  - Teste manual imediato com botão na UI.

---

## ⚡ 8. Otimização de Performance & Bundle

Configurado em [`vite.config.ts`](file:///e:/Apps/AppControleTotal/vite.config.ts):
- **Code Splitting com Rollup `manualChunks`:**
  - `vendor-react`: `react`, `react-dom`, `react-router-dom`, `zustand` (~70 kB gzip).
  - `vendor-charts`: `recharts` (~111 kB gzip, carregado somente no Dashboard).
  - `vendor-icons`: `lucide-react`.
  - `vendor-supabase`: `@supabase/supabase-js`.
- **Resultado:** O carregamento inicial caiu de **1.013 KB** para apenas **76 KB** (**22 KB gzipped**), garantindo carregamento instantâneo em conexões móveis.

---

## 🚀 9. Guia de Comandos e Desenvolvimento

```bash
# Iniciar ambiente de desenvolvimento
npm run dev

# Validar tipos TypeScript e compilar bundle de produção
npm run build

# Executar linter ultra-rápido (Oxlint)
npm run lint

# Visualizar build localmente
npm run preview

# Sincronizar migrações com o Supabase
npm run supabase:push
```

---

## 📝 10. Variáveis de Ambiente (.env)

```env
# Conexão com o Supabase
VITE_SUPABASE_URL=https://fxjdaqpfjdntbyjettun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Configurações do Hermes (opcionais via .env, também configuráveis na UI)
VITE_HERMES_WEBHOOK_URL=https://hermes.seu-dominio.com/webhook
VITE_HERMES_API_KEY=sua_chave_secreta
VITE_LLM_API_KEY=gsk_... ou sk-or-...
```

---

## 📲 11. Webhook de Captura Vercel & Web Share Target (Mobile PWA)

* **Webhook de Captura Multi-Entidade ([api/webhook/hermes-capture.js](file:///e:/Apps/AppControleTotal/api/webhook/hermes-capture.js)):**
  - Rota Serverless Vercel: `POST /api/webhook/hermes-capture`
  - Resolução resiliente de variáveis de ambiente (`SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`).
  - Suporte completo a todas as entidades enviadas pelo Bot do Telegram e Hermes Agent:
    - 🛒 **Despensa / Compras (`pantry`)**: Adiciona itens únicos ou listas completas (`pantry_add`, `pantry_shopping_list`).
    - 🎬 **Mídias & Links (`media`)**: Salva links do YouTube, Instagram e artigos no Life-Log.
    - 💸 **Gastos (`spending`)**: Registra despesas semanais.
    - 📅 **Compromissos (`events`)**: Registra reuniões e eventos na Agenda.
    - 📝 **Diário (`life_log`)** e **Cofre de Fatos (`facts`)**.
  - Autenticação segura via `Authorization: Bearer` ou `X-Hermes-Signature`.

* **Web Share Target PWA ([src/features/life-log/ShareTargetHandler.tsx](file:///e:/Apps/AppControleTotal/src/features/life-log/ShareTargetHandler.tsx)):**
  - Rota: `/share-target`
  - Permite que o app receba compartilhamentos nativos do Android/iOS (YouTube, Instagram, navegadores) via menu nativo do sistema, salvando diretamente no Life-Log com notificação toast imediata.

---

## 📅 12. Sincronização com Google Calendar (iCal Feed .ics)

* **Parser RFC 5545 iCalendar ([src/lib/ical.ts](file:///e:/Apps/AppControleTotal/src/lib/ical.ts)):**
  - Parser resiliente para arquivos `.ics` do Google Calendar.
  - Conversão inteligente de datas UTC/Timezone, status, localização e categorização automática de eventos (`reuniao`, `viagem`, `habit`, `pessoal`).
* **Endpoint Serverless Proxy ([api/calendar/sync-ical.js](file:///e:/Apps/AppControleTotal/api/calendar/sync-ical.js)):**
  - Rota: `POST /api/calendar/sync-ical`
  - Faz o download do `.ics` diretamente dos servidores do Google (evitando bloqueios de CORS no navegador), realiza o parse dos eventos e faz upsert em lote no Supabase (`events`).
* **Sincronização Avançada & Expansão de Recorrência (RRULE):**
  - Expansão automática de eventos recorrentes do Google Calendar (`FREQ=DAILY`, `FREQ=WEEKLY`, `FREQ=MONTHLY`, `FREQ=YEARLY`) para garantir que compromissos periódicos apareçam nas datas vigentes.
  - Inserção atômica em lote com `db.upsertMany('events', ...)` no adapter central.
  - Suporte a múltiplos proxies de fallback (`allorigins`, `corsproxy.io`) para ambiente local e produção.

---

## 🔔 13. Sistema de Notificações & Ajustes Visuais na Dashboard

* **Notificações Push / PWA ([src/lib/notifications.ts](file:///e:/Apps/AppControleTotal/src/lib/notifications.ts)):**
  - Alertas automáticos ao abrir a Dashboard:
    - 📅 **Agenda do Dia**: Notifica os compromissos agendados para o dia atual com horário e local.
    - ⚠️ **Despensa**: Alerta itens próximos da data de validade (≤ 3 dias).
  - Deduplicação inteligente por sessão (`sessionStorage`) para evitar notificações repetitivas ao navegar entre telas.
* **Correção dos Badges de Data da Dashboard ([src/features/dashboard/Widgets.tsx](file:///e:/Apps/AppControleTotal/src/features/dashboard/Widgets.tsx) & [src/lib/utils.ts](file:///e:/Apps/AppControleTotal/src/lib/utils.ts)):**
  - Função `formatDayAndMonth()` para extrair o dia numérico e o mês abreviado em maiúsculas (`21 AGO`, `06 SET`), eliminando a preposição `"DE"` que quebrava o layout.
---

## 🛒 14. Despensa em Lista Compacta & Consolidação de Alertas

* **Agrupamento no Radar de Alertas ([src/features/dashboard/Alerts.tsx](file:///e:/Apps/AppControleTotal/src/features/dashboard/Alerts.tsx)):**
  - Em vez de gerar 1 card individual para cada item em falta, consolida todos em um único card de alerta (`4 itens em falta para comprar: Coca zero, Batata, Leite, Doce`).
  - Itens com validade próxima também são consolidados em 1 único card informativo.
* **Visualização em Lista Compacta da Despensa ([src/features/despensa/PantryListView.tsx](file:///e:/Apps/AppControleTotal/src/features/despensa/PantryListView.tsx)):**
  - Tabela/lista densa desenhada para alta escala (200+ itens).
  - **Steppers de Estoque Rápido (`-` `+`):** Alteração instantânea de quantidade em 1 clique sem abrir modais.
  - Badges coloridos de status (*"Falta comprar"*, *"Estoque baixo"*, *"OK"*, *"Vencendo em Xd"*).
* **Controles de Produtividade na Despensa ([src/features/despensa/DespensaPage.tsx](file:///e:/Apps/AppControleTotal/src/features/despensa/DespensaPage.tsx)):**
---

## 🌟 15. Rebranding para Life OS Hub, Modo Supermercado & Lembretes Prévios

* **Rebranding Oficial para Life OS Hub:**
  - Atualização do título da página (`<title>Life OS Hub</title>`), PWA Web Manifest (`Life OS Hub`), Header e Sidebar.
* **Modo Supermercado Interativo ([src/features/despensa/SupermarketModeModal.tsx](file:///e:/Apps/AppControleTotal/src/features/despensa/SupermarketModeModal.tsx)):**
  - Tela dedicada/modal com checkboxes grandes de alta sensibilidade para compras rápidas no celular.
  - Barra de progresso visual do carrinho (`X de Y itens comprados`).
  - **Finalizar Compras:** Repõe o estoque dos itens marcados com 1 clique.
  - **Disparo / Cópia para o Telegram:** Envia a lista formatada com emojis direto para o chat do Hermes ou copia para o clipboard.
* **Baixa de Compras via Webhook Telegram ([api/webhook/hermes-capture.js](file:///e:/Apps/AppControleTotal/api/webhook/hermes-capture.js)):**
  - Suporte ao comando `"Comprei X"` ou `"Repus X"` no Telegram. O webhook reconhece a intenção, dá baixa na lista de compras e atualiza o estoque no Supabase.
* **Briefing com IA do Hermes ([src/features/dashboard/HermesBriefingCard.tsx](file:///e:/Apps/AppControleTotal/src/features/dashboard/HermesBriefingCard.tsx)):**
  - Síntese inteligente matinal combinando agenda do dia, itens em falta na despensa e manutenções críticas.
* **Lembretes 15 Minutos Antes ([src/lib/notifications.ts](file:///e:/Apps/AppControleTotal/src/lib/notifications.ts)):**
  - Monitoramento contínuo em background (`setInterval` 60s) que dispara notificação no PWA/Navegador quando um compromisso da agenda estiver a ≤ 15 minutos de iniciar.

---

## ⚡ 16. Proxy Serverless de LLMs & Resolução de CORS (NVIDIA / Groq / OpenRouter)

* **Proxy Serverless Dedicado ([api/llm/proxy.js](file:///e:/Apps/AppControleTotal/api/llm/proxy.js)):**
  - Endpoint: `POST /api/llm/proxy`
  - Bypassa restrições de CORS impostas pelos servidores da **NVIDIA AI Foundation** e outros provedores quando chamados diretamente do navegador.
  - Suporta as ações:
    - `action: 'models'`: Consulta a lista de modelos do provedor via Node.js backend.
    - `action: 'chat'`: Executa chat completions com streaming e parsing de respostas.
* **Resiliência e Modelos Padrão ([src/lib/llmProviders.ts](file:///e:/Apps/AppControleTotal/src/lib/llmProviders.ts)):**
  - Lista curada com os principais modelos da NVIDIA AI Foundation (`meta/llama-3.3-70b-instruct`, `deepseek-ai/deepseek-r1`, `nvidia/llama-3.1-nemotron-70b-instruct`, `deepseek-ai/deepseek-v3`, `mistralai/mistral-large-2407`, etc.).
  - Fallback automático para garantir que a lista de modelos nunca fique vazia ou bloqueie o usuário caso a API de metadados esteja temporariamente instável.
* **Hermes Chat via Proxy ([src/lib/hermes.ts](file:///e:/Apps/AppControleTotal/src/lib/hermes.ts)):**
  - Integração prioritária com o proxy para envio de prompts e execução de ações do Hermes.

---

## 💵 17. Finanças Pragmáticas (Sem Gráficos), Hábitos Diários & Cofre de Documentos

* **Módulo de Finanças Pragmático ([src/features/financas/FinancasPage.tsx](file:///e:/Apps/AppControleTotal/src/features/financas/FinancasPage.tsx)):**
  - **Zero Poluição Visual:** Desenvolvido sob a diretriz de **números claros e executivos**, sem gráficos confusos.
  - **Scorecard Executivo (4 KPIs):**
    - `Gasto Hoje` (total em R$ e contagem de lançamentos).
    - `Últimos 7 Dias` (total em R$ e média diária).
    - `Total do Mês Vigente` (total em R$).
    - `Teto Mensal & Disponível` (orçamento restante personalizável em 1 clique).
  - **Extrato Diário Compacto:**
    - Tabela densa com ícones temáticos por categoria (Alimentação, Transporte, Moradia, Saúde, Lazer, etc.), descrição, data/hora e valores em BRL destacados.
    - Filtros por categoria e busca instantânea.
    - Modal de lançamento rápido `+ Novo Gasto` ([`SpendingFormModal.tsx`](file:///e:/Apps/AppControleTotal/src/features/financas/SpendingFormModal.tsx)).
  - **Checklist de Contas Fixas & Assinaturas do Mês:**
    - Controle de despesas recorrentes (Internet, Energia, Aluguel, Cartão de Crédito, Streaming).
    - Checkbox interativo para marcar como "Pago" no mês vigente com persistência mensal.
    - Modal `+ Nova Conta Fixa` ([`FixedBillFormModal.tsx`](file:///e:/Apps/AppControleTotal/src/features/financas/FixedBillFormModal.tsx)).

* **Checklist Diário de Rotina & Hábitos ([src/features/dashboard/DailyHabitsCard.tsx](file:///e:/Apps/AppControleTotal/src/features/dashboard/DailyHabitsCard.tsx)):**
  - Card integrado ao Dashboard com barra de progresso visual (`X de Y concluídos hoje`).
  - Marcação de hábitos diários (Água 2L, Exercício, Leitura, Revisar agenda) com 1 toque e persistência por data (`YYYY-MM-DD`).
  - Criação rápida de novos hábitos customizados inline.

* **Cofre de Documentos, Chaves & Informações Úteis ([src/features/life-log/DocVaultSection.tsx](file:///e:/Apps/AppControleTotal/src/features/life-log/DocVaultSection.tsx)):**
  - Seção estruturada no Life-Log para armazenamento seguro de referências do dia a dia (Renavam do carro, Placa, Cartão SUS, Medidas da casa, Filtro de ar condicionado, etc.).
  - **Cópia Instantânea em 1 Clique (`Copiar`):** Copia o número/medida diretamente para o clipboard para colagem rápida no WhatsApp/Telegram.
  - Filtros por categoria (Veículo, Casa, Saúde, Financeiro, Pessoal) e busca rápida.

---
*Documento consolidado e mantido como fonte única da verdade para evolução contínua da aplicação.*




