# Life OS Hub — PRD

> **Nota:** este é o PRD completo e autoritativo (sincronizado com a versão integral fornecida pelo usuário). Fases 0, 0.5, 5, 7 e 8 implementadas; roadmap e governança em [CLAUDE.md](CLAUDE.md).

Você é um Engenheiro de Software Full-Stack Senior especialista em UX/UI moderno e responsivo. Sua tarefa é construir um "Life OS Hub" (Sistema Operacional Pessoal) completo, modular e responsivo para telas de Smartphones, Tablets e Desktops.

======================================================================
1. DIRETRIZES DE DESIGN SYSTEM E RESPONSIVIDADE
======================================================================
- ESTÉTICA: Dark mode nativo "Premium SaaS" (estilo Linear.app/Vercel).
- CORES BASE: Zinc 950 (Fundo), Zinc 900 (Cards), Zinc 800 (Bordas).
- ACCENTS: Dashboard (Roxo), Life-Log (Verde), Manutenção (Laranja), Despensa (Violeta), Viagens (Ciano), Agenda/Email (Rose).
- RESPONSIVIDADE:
  - Mobile: Bottom Navigation Bar (Glassmorphism).
  - Tablet: Navigation Rail lateral + Grids 2 colunas.
  - Desktop: Sidebar completa + Grids de alta densidade.

======================================================================
2. ESTRUTURA DE NAVEGAÇÃO E HEADER
======================================================================
- Sidebar/Bottombar (6 rotas): 
  1. 📊 Dashboard | 2. 📝 Life-Log | 3. 🛠️ Manutenção | 4. 🛒 Despensa | 5. ✈️ Viagens | 6. 📅 Agenda & Inbox
- Header Global:
  - Neural Omnibox (Cmd+K): Busca semântica inteligente e campo para colar links diretos (YouTube, Instagram, Artigos).
  - Badge Status: "Hermes Sync Active".
  - Botão "+": Adição rápida global.

======================================================================
3. DETALHAMENTO MÓDULOS
======================================================================
- DASHBOARD: 
  - Omnibox, KPIs, Grids de Alertas, "Próximos Compromissos" (Agenda), "Emails Críticos" (Inbox Inteligente).
  - SAFE-TO-SPEND & CONSELHEIRO FINANCEIRO: Cota diária livre calculada em tempo real com indicador de ritmo e burn rate.
  - LIFE INSIGHTS: Componente de gráficos (recharts) exibindo tendências (ex: gastos, frequência de manutenção).
- LIFE-LOG & LEITURA (CAPTURA DE MÍDIAS E LINKS):
  - PROCESSADOR DE LINKS: Tratamento especial para URLs do YOUTUBE (extração de título, thumbnail e resumo de áudio/vídeo) e INSTAGRAM (salvamento de posts, reels e legendas para ver depois).
  - Visão Artigos & Mídias: Cards com resumo gerado por IA, thumbnail do vídeo/post e tempo estimado de consumo.
  - Visão Cofre de Fatos: Anotações rápidas, senhas, códigos de rastreio e notas com tags.
- MANUTENÇÃO & ATIVOS:
  - Gestão de ativos (Carro/Casa), barra de vida útil visual, histórico e modal de novo registro.
  - TCO POR KM: Métrica consolidada de custo total de operação por quilômetro rodado (combustível + peças e manutenções).
- CONSUMO & DESPENSA:
  - Estoque visual e exportação de lista via Webhook para Hermes Agent/WhatsApp.
  - SCANNER EAN-13: Leitor de código de barras com integração direta à API pública do OpenFoodFacts para autocompletar produtos.
  - HERMES CHEF: Geração de receitas personalizadas com IA e narração em áudio.
- VIAGENS & EXPERIÊNCIAS:
  - Itinerário cronológico, paradas e locais salvos.
  - SMART TRAVEL ASSISTANT: Checklist inteligente de malas/documentos por IA e estimativa de combustível baseada no Km/L do veículo cadastrado.
- AGENDA & INTEGRATION (HERMES BRIDGE):
  - Sincronização bidirecional com calendário e inbox (filtrado pelo Hermes).

======================================================================
4. INTELIGÊNCIA E SEGURANÇA (FULL POWER)
======================================================================
- NEURAL SEARCH (BUSCA SEMÂNTICA):
  - A barra Omnibox usa busca vetorial para indexar anotações, documentos, vídeos do YouTube salvos e posts do Instagram.
- EMERGENCY MODE (SEGURANÇA):
  - Autenticação por código via Hermes Agent (WhatsApp/Telegram) para dispositivos não confiáveis.
- DATA PORTABILITY (BACKUP AUTOMÁTICO):
  - Backup semanal agendado (JSON) com download local — `backupStore` + `backupScheduler.ts` (simulação; upload real para Google Drive/Dropbox é fase futura com credenciais).

======================================================================
5. ARQUITETURA TÉCNICA
======================================================================
- PWA/OFFLINE: Service Worker (vite-plugin-pwa) com pré-cache de assets + runtime caching (Google Fonts, `/api/*`); registro via `main.tsx` e utilitários em `pwa.ts`.
- API/WEBHOOKS: Estrutura `safeApi.ts` envolve o mock async com fallback automático para fila offline; webhook mock POST (JSON + HMAC) configurável via UI de agenda (SettingsWebhook).

======================================================================
6. COMPARTILHAMENTO MOBILE & INTEGRACÃO YOUTUBE / INSTAGRAM
======================================================================
- WEB SHARE TARGET (PWA): 
  - Permite que o app apareça no menu "Compartilhar" nativo do celular (Android/iOS) ao navegar no INSTAGRAM, YOUTUBE, TikTok ou navegador.
- CAPTURA RÁPIDA VIA HERMES AGENT:
  - Envio de links do Instagram ou YouTube diretamente na conversa do WhatsApp/Telegram com o Hermes.
  - Endpoint `/api/webhook/hermes-capture`: O backend recebe o link do Hermes, identifica se é do YouTube/Instagram, extrai o conteúdo com IA e salva na aba Life-Log/Leituras.
- TOAST DE CONFIRMAÇÃO: Notificação no app quando um link de rede social for processado com sucesso.

======================================================================
7. MOCK DATA E ATALHOS
======================================================================
- Mock Data para links do YOUTUBE e INSTAGRAM salvos com resumos de IA no Life-Log.
- Dados para 3 ativos, 8 itens de despensa, 1 viagem, 3 compromissos de agenda.
- Atalhos (Cmd/Ctrl+K, Cmd/Ctrl+N, Alt+1..6).
- Skeleton Loaders (animate-pulse) e Empty States em todas as telas.

======================================================================
8. FASE 8 — BACKUP, WEBHOOK E PWA (OFFLINE) ✅
======================================================================
Status: **concluída** (persistência local resiliente, PWA offline, notificações toast, backup automático e webhook mock).

Entregáveis (todos concluídos):
- **Persistência local resiliente:** `offlineQueueStore` enfileira ações offline e replays quando a conexão retorna; `backgroundSync.ts` detecta o estado de rede (`navigator.onLine`) e aciona o flush.
- **API segura:** `safeApi.ts` envolve o mock async com fallback automático para a fila offline em caso de erro.
- **Backup & restore:** `backupStore` (persistência de schedule) + `backupScheduler.ts` (export/import JSON + backup automático semanal periódico via `visibilitychange` + `focus`).
- **Webhook mock:** payload JSON POST para endpoint configurado, com assinatura HMAC opcional (`X-Hermes-Signature`).
- **PWA offline:** service worker (vite-plugin-pwa) pré-cacheia assets + shell + runtime caching (fonts, `/api/*`); `pwa.ts` utilitários para registro e lifecycle; `registerServiceWorker()` chamado em `main.tsx` em produção.
- **Feedback:** `ToastContainer.tsx` renderiza toasts de sucesso/erro/alerta (backup concluído, sincronização offline, etc.).

Resumo do que Fase8 entregou:
Automatização de backup (JSON/CSV) com scheduler, runtime caching offline via service worker, notificações toast para feedback de usuário, fila offline com sincronização em background e integração webhook mock com o Hermes Agent — deixando o app funcional no modo avião e com dados protegidos.

ENTREGÁVEL:
Gere os componentes, páginas e lógica de backend simulada (Mock) com React e Tailwind CSS. Layout impecável e responsivo para todos os dispositivos.