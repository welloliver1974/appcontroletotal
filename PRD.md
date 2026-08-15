# Life OS Hub — PRD

> **Nota:** este é o PRD completo e autoritativo (sincronizado com a versão integral fornecida pelo usuário). Fases 0–2 implementadas; roadmap e governança em [CLAUDE.md](CLAUDE.md).

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
  - LIFE INSIGHTS: Componente de gráficos (recharts) exibindo tendências (ex: gastos, frequência de manutenção).
- LIFE-LOG & LEITURA (CAPTURA DE MÍDIAS E LINKS):
  - PROCESSADOR DE LINKS: Tratamento especial para URLs do YOUTUBE (extração de título, thumbnail e resumo de áudio/vídeo) e INSTAGRAM (salvamento de posts, reels e legendas para ver depois).
  - Visão Artigos & Mídias: Cards com resumo gerado por IA, thumbnail do vídeo/post e tempo estimado de consumo.
  - Visão Cofre de Fatos: Anotações rápidas, senhas, códigos de rastreio e notas com tags.
- MANUTENÇÃO & ATIVOS:
  - Gestão de ativos (Carro/Casa), barra de vida útil visual, histórico e modal de novo registro.
- CONSUMO & DESPENSA:
  - Estoque visual e exportação de lista via Webhook para Hermes Agent/WhatsApp.
- VIAGENS & EXPERIÊNCIAS:
  - Itinerário cronológico e locais salvos.
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
  - Backup semanal agendado (JSON/CSV) do banco de dados para storage externo (Google Drive/Dropbox).

======================================================================
5. ARQUITETURA TÉCNICA
======================================================================
- ARQUITETURA DE CONTEÚDO: Pasta `/content/` para cursos (JSON/Markdown).
- PWA/OFFLINE: Service Worker para cache e modo avião.
- API/WEBHOOKS: Estrutura para envio de dados e comandos para o Hermes Agent com envio de contexto.

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
- Atalhos (Cmd/Ctrl+K, Cmd/Ctrl+N, Alt+1..7).
- Skeleton Loaders (animate-pulse) e Empty States em todas as telas.

ENTREGÁVEL:
Gere os componentes, páginas e lógica de backend simulada (Mock) com React e Tailwind CSS. Layout impecável e responsivo para todos os dispositivos.