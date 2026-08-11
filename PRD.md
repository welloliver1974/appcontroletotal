Você é um Engenheiro de Software Full-Stack Senior especialista em UX/UI moderno e responsivo. Sua tarefa é construir um "Life OS Hub" (Sistema Operacional Pessoal) completo, modular e responsivo para telas de Smartphones, Tablets e Desktops.

======================================================================
1. DIRETRIZES DE DESIGN SYSTEM E RESPONSIVIDADE
======================================================================
- ESTÉTICA: Dark mode nativo "Premium SaaS" (estilo Linear.app/Vercel).
- CORES BASE: Zinc 950 (Fundo), Zinc 900 (Cards), Zinc 800 (Bordas).
- ACCENTS: Dashboard (Roxo), Life-Log (Verde), Manutenção (Laranja), Despensa (Violeta), Viagens (Ciano), Inglês (Azul Royal), Agenda/Email (Rose).
- RESPONSIVIDADE:
  - Mobile: Bottom Navigation Bar (Glassmorphism).
  - Tablet: Navigation Rail lateral + Grids 2 colunas.
  - Desktop: Sidebar completa + Grids de alta densidade.

======================================================================
2. ESTRUTURA DE NAVEGAÇÃO E HEADER
======================================================================
- Sidebar/Bottombar (7 rotas): 
  1. 📊 Dashboard | 2. 📝 Life-Log | 3. 🛠️ Manutenção | 4. 🛒 Despensa | 5. ✈️ Viagens | 6. 🇬🇧 Inglês | 7. 📅 Agenda & Inbox
- Header Global:
  - Neural Omnibox (Cmd+K): Busca semântica inteligente.
  - Badge Status: "Hermes Sync Active".
  - Botão "+": Adição rápida global.

======================================================================
3. DETALHAMENTO MÓDULOS
======================================================================
- DASHBOARD: 
  - Omnibox, KPIs, Grids de Alertas, "Próximos Compromissos" (Agenda), "Emails Críticos" (Inbox Inteligente).
  - LIFE INSIGHTS: Componente de gráficos (recharts) exibindo tendências (ex: gastos, evolução de vocabulário, frequência de manutenção).
- LIFE-LOG & LEITURA:
  - Visão Artigos (Resumo IA) e Cofre de Fatos (Tags).
- MANUTENÇÃO & ATIVOS:
  - Gestão de ativos (Carro/Casa), barra de vida útil visual, histórico e modal de novo registro.
- CONSUMO & DESPENSA:
  - Estoque visual e exportação de lista via Webhook.
- VIAGENS & EXPERIÊNCIAS:
  - Itinerário cronológico e locais salvos.
- ENGLISH MASTERY (SALA DE AULA - NÍVEL B1):
  - Catálogo de cursos, Lesson Player (Markdown/JSON), Quiz, SRS (Flashcards), Free Conversation (Hermes Roleplay).
- AGENDA & INTEGRATION (HERMES BRIDGE):
  - Sincronização bidirecional com calendário e inbox (filtrado pelo Hermes).

======================================================================
4. INTELIGÊNCIA E SEGURANÇA (FULL POWER)
======================================================================
- NEURAL SEARCH (BUSCA SEMÂNTICA):
  - A barra Omnibox deve usar busca vetorial (Embeddings) para indexar anotações, documentos e fatos, permitindo perguntas em linguagem natural (ex: "O que preciso trocar em casa?").
- EMERGENCY MODE (SEGURANÇA):
  - Camada de autenticação: Ao iniciar, se o dispositivo não estiver marcado como "Trusted", exigir código de verificação via Hermes Agent (WhatsApp/Telegram).
- DATA PORTABILITY (BACKUP AUTOMÁTICO):
  - Função agendada (Cron job) no backend para exportar todo o banco de dados (JSON/CSV) e salvar em storage externo (Google Drive/Dropbox) semanalmente.

======================================================================
5. ARQUITETURA TÉCNICA
======================================================================
- ARQUITETURA DE CONTEÚDO: Pasta `/content/` para cursos (JSON/Markdown).
- PWA/OFFLINE: Service Worker para cache e modo avião.
- API/WEBHOOKS: Estrutura para envio de dados e comandos para o Hermes Agent com envio de contexto.

======================================================================
6. MOCK DATA E ATALHOS
======================================================================
- Atalhos (Cmd/Ctrl+K, Cmd/Ctrl+N, Alt+1..7).
- Skeleton Loaders (animate-pulse) e Empty States (ícones/mensagens).
- Web Share Target (PWA) e Webhook `/api/webhook/hermes-capture`.

ENTREGÁVEL:
Gere os componentes, páginas e lógica de backend simulada (Mock) com React e Tailwind CSS. Layout impecável e responsivo para todos os dispositivos.