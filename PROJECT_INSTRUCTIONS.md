# 🚀 INSTRUÇÕES MESTRES DE DESENVOLVIMENTO — LIFE OS HUB

Este documento é a especificação técnica e de produto unificada para o desenvolvimento do **Life OS Hub**. Ele contém o **PRD Mestre da Interface**, a **Arquitetura de Banco de Dados**, os **Endpoints de API** e o **Fluxo de Integração com o Hermes Agent**.

\---

## 📋 PARTE 1: PRD MESTRE (INTERFACE \& EXPERIÊNCIA DO USUÁRIO)

Você é um Engenheiro de Software Full-Stack Senior especialista em UX/UI moderno e responsivo. Sua tarefa é construir um "Life OS Hub" (Sistema Operacional Pessoal) completo, modular e responsivo para telas de Smartphones, Tablets e Desktops.

======================================================================

1. DIRETRIZES DE DESIGN SYSTEM E RESPONSIVIDADE
======================================================================
* ESTÉTICA: Dark mode nativo "Premium SaaS" (estilo Linear.app / Vercel).
* CORES BASE:

  * Fundo da Aplicação: #09090b (Zinc 950)
  * Superfícies/Cards: #121215 (Zinc 900 ajustado) com bordas em #27272a (Zinc 800)
  * Transparências: backdrop-blur-md com bg-zinc-900/60 para elementos flutuantes.
* ACCENTS POR MÓDULO:

  * Dashboard/Geral: Roxo Elétrico (#8b5cf6)
  * Life-Log \& Leitura: Verde Esmeralda (#10b981)
  * Manutenção \& Ativos: Âmbar/Laranja (#f59e0b)
  * Despensa \& Consumo: Violeta (#a855f7)
  * Viagens \& Experiências: Ciano (#06b6d4)
  * Agenda \& Inbox: Rose (#f43f5e)
* TIPOGRAFIA: Inter ou Geist Sans. Títulos em font-bold, métricas em font-mono.
* COMPORTAMENTO LAYOUT MULTI-DISPOSITIVO:

  * MOBILE (< 768px): Navigation Bar flutuante na parte inferior (Bottom Glassmorphism Bar) com ícones e labels. Layout em coluna única. Ações primárias fixas na área de alcance do polegar.
  * TABLET (768px - 1024px): Navigation Rail lateral retrátil apenas com ícones. Grids ajustados para 2 colunas. Painéis secundários abrem como gavetas deslizantes (Sheet/Drawer).
  * DESKTOP (> 1024px): Sidebar lateral completa expansível. Grid de alta densidade de 3 a 4 colunas no Dashboard. Painéis detalhados em visão split-screen (lista à esquerda, detalhe à direita).

======================================================================
2. ESTRUTURA DE NAVEGAÇÃO E HEADER GLOBAL
===

* Sidebar/Bottombar com 6 rotas principais:

  1. 📊 Dashboard (Overview)
  2. 📝 Life-Log \& Mídias
  3. 🛠️ Manutenção \& Ativos
  4. 🛒 Despensa \& Consumo
  5. ✈️ Viagens \& Experiências
  6. 📅 Agenda \& Inbox (Hermes Bridge)
* Header Global:

  * Neural Omnibox (Cmd+K / Ctrl+K): Busca semântica inteligente e campo para colar links diretos (YouTube, Instagram, Artigos ou notas rápidas).
  * Status da conexão com o assistente (Badge verde "Hermes Sync Active").
  * Botão de adição rápida "+" que abre um modal global para inserir qualquer dado (Nota, Manutenção, Item ou Link).

======================================================================
3. DETALHAMENTO MÓDULO POR MÓDULO
===

\--- TELA 1: DASHBOARD CENTRAL (OVERVIEW) ---

* Omnibox Prominente no topo.
* Métrica Cards (KPIs Superiores):

  * Manutenções Próximas (ex: 2 urgentes)
  * Itens Críticos de Estoque (ex: 4 para comprar)
  * Leituras/Mídias Pendentes (ex: 5 resumos novos)
  * Rastreios Ativos (ex: 3 pacotes em trânsito)
* Grid Principal:

  * Seção 1: "Atenção Imediata" (Cards vermelhos/âmbar com alertas de revisão do carro ou filtros de água).
  * Seção 2: "Life Insights" (Componente com gráficos do recharts exibindo tendências de gastos e ciclos).
  * Seção 3: "Próximos Compromissos" (Agenda sincronizada via Hermes).
  * Seção 4: "Emails Críticos" (Inbox Inteligente filtrado pelo Hermes com resumo e botão de ação rápida).
  * Seção 5: "Últimas Leituras e Vídeos Processados" (Cards com thumbnail e resumo IA).
  * Seção 6: "Lista de Compras Automática" (Preview com checkbox para marcar itens).
  * Seção 7: "Timeline do Life-Log" (Stream vertical de últimas notas, fatos e códigos de rastreio).

\--- TELA 2: LIFE-LOG \& LEITURA (CAPTURA DE MÍDIAS E LINKS) ---

* PROCESSADOR DE LINKS: Tratamento dedicado para URLs do YOUTUBE (extração de título, thumbnail e resumo de vídeo gerado por IA) e INSTAGRAM (salvamento de posts, reels e legendas para ver depois).
* Alternador de Visão (Tabs): \[ 📚 Artigos, Vídeos \& Mídias ] | \[ 🧠 Cofre de Fatos \& Notas ]
* Visão Artigos \& Mídias:

  * Tabela/Grid de links com thumbnail, título, domínio/plataforma (YouTube, Instagram, Web), data de inclusão e status (Não Lido / Lido).
  * Botão "Ver Resumo IA": Abre modal estruturado contendo:

    * Resumo em 3 tópicos executivos.
    * Principais aprendizados / Key Takeaways.
    * Citações e pontos marcantes.
* Visão Cofre de Fatos:

  * Lista no estilo linha do tempo com busca por tags (ex: #casa, #senha, #rastreio, #reuniao).
  * Cards de anotações rápidas e rastreamento visual de entregas.

\--- TELA 3: MANUTENÇÃO DE ATIVOS (CASA + VEÍCULOS) ---

* Filtro por Categoria: \[ Todos ] | \[ 🚗 Veículos ] | \[ 🏠 Casa \& Eletro ]
* Grid de Ativos:

  * Card de Veículo (ex: Carro): Exibe quilometragem atual, data da última troca de óleo, barra visual de vida útil dos pneus, freios e fluidos.
  * Card de Equipamento (ex: Ar Condicionado, Filtro de Água): Exibe data da última limpeza e contador regressivo até a próxima.
* Histórico de Intervenções: Tabela retrátil para cada ativo mostrando: Data, Serviço Realizado, Custo (R$) e Observações.
* Modal de Novo Evento: Formulário para registrar manutenção realizada, atualizando automaticamente os contadores do ativo.

\--- TELA 4: CONSUMO \& DESPENSA ---

* Visão Geral do Estoque:

  * Tabela dinâmica com colunas: Produto, Categoria (Alimentação, Limpeza, Higiene), Frequência de Consumo, Nível Atual (Barra de progresso visual: Crítico < 25%, Médio 50%, Cheio 100%) e Ações.
* Filtro Rápido: Botão "Apenas Críticos / Comprar".
* Painel de Ação:

  * Botão "Exportar para Hermes/WhatsApp": Gera e envia a lista formatada via Webhook.

\--- TELA 5: VIAGENS \& EXPERIÊNCIAS ---

* Alternador de Visão: \[ ✈️ Itinerários \& Viagens ] | \[ 📍 Restaurantes \& Locais ]
* Visão Itinerários:

  * Card Principal da Próxima Viagem: Banner com destino, contagem regressiva de dias, e linha do tempo de eventos (Voo, Hotel, Passeios).
  * Suporte a upload fictício ou visualização de bilhetes/PDFs salvos.
* Visão Restaurantes \& Locais:

  * Grid de cards de lugares salvos por Cidade e Categoria (Café, Jantar, Ponto Turístico), com nota fictícia, faixa de preço e link do mapa.

\--- TELA 6: AGENDA \& INBOX (HERMES BRIDGE) ---

* VISÃO CALENDÁRIO:

  * Visualização de compromissos do dia e semana sincronizados com a agenda tratada pelo Hermes.
  * Modal "Novo Compromisso" que permite enviar o agendamento direto para o calendário.
* VISÃO SMART INBOX:

  * Lista de e-mails importantes pré-filtrados pelo Hermes (Notas fiscais, alertas bancários, confirmações de voos/viagens).
  * Cards resumidos contendo ações: \[ Arquivar ] | \[ Responder via Hermes ].

======================================================================
4. INTELIGÊNCIA, SEGURANÇA E BACKUP (FULL POWER)
===

* NEURAL SEARCH (BUSCA SEMÂNTICA):

  * A barra Omnibox utiliza busca vetorial para indexar anotações, documentos, vídeos do YouTube salvos, posts do Instagram e notas do Life-Log, permitindo buscas por linguagem natural (ex: "Qual o modelo da lâmpada da sala?").
* EMERGENCY MODE (SEGURANÇA):

  * Camada de autenticação: Ao iniciar o app em dispositivos não marcados como confiáveis, solicitar código PIN de verificação enviado via Hermes Agent (WhatsApp/Telegram).
* DATA PORTABILITY (BACKUP AUTOMÁTICO):

  * Estrutura de função no backend para exportação semanal agendada (JSON/CSV) de todo o banco de dados para salvar em storage externo (Google Drive/Dropbox).

======================================================================
5. COMPARTILHAMENTO MOBILE \& INTEGRAÇÃO YOUTUBE / INSTAGRAM
===

* WEB SHARE TARGET (PWA):

  * Permite que o aplicativo PWA apareça no menu "Compartilhar" nativo do celular (Android/iOS) ao navegar no INSTAGRAM, YOUTUBE ou navegador Web.
* CAPTURA RÁPIDA VIA HERMES AGENT:

  * Envio de links do Instagram, vídeos do YouTube ou textos diretamente na conversa do WhatsApp/Telegram com o Hermes.
  * Endpoint `/api/webhook/hermes-capture`: O backend recebe o link enviado pelo Hermes, identifica a origem (YouTube/Instagram/Artigo), processa o resumo com IA e salva no banco de dados.
* TOAST DE CONFIRMAÇÃO: Notificação no app informando: "Link do Instagram/YouTube recebido e processado com sucesso!".

======================================================================
6. DADOS FICTÍCIOS (MOCK DATA) OBRIGATÓRIOS
===

Crie uma estrutura de dados fictícios completa (JSON/State) para alimentar o app imediatamente:

* Módulo Mídias/Life-Log: 2 cards de vídeos do YOUTUBE salvos com resumos IA e 2 cards de posts do INSTAGRAM salvos, além de 6 entradas de notas/fatos com tags (#casa, #senha, #rastreio).
* Módulo Manutenção: 3 ativos (1 Carro, 1 Ar-Condicionado, 1 Filtro de Água) com barras de progresso de ciclos e histórico.
* Módulo Despensa: 8 itens em diferentes estados de nível (crítico, médio, cheio).
* Módulo Viagens: 1 viagem futura cadastrada com 4 etapas no itinerário e 3 restaurantes salvos.
* Módulo Agenda \& Inbox: 3 compromissos de agenda para hoje e 2 e-mails críticos resumidos no Inbox.

======================================================================
7. ATALHOS DE TECLADO E ESTADOS VISUAIS (UI)
===

* ATALHOS DE TECLADO (DESKTOP):

  * Tecla 'Cmd+K' / 'Ctrl+K': Foca imediatamente na barra Omnibox de qualquer lugar.
  * Tecla 'Cmd+N' / 'Ctrl+N': Abre o modal global de criação rápida.
  * Teclas 'Alt+1' a 'Alt+6': Navegação instantânea entre as 6 rotas/módulos.
* ESTADOS VISUAIS (LOADING E EMPTY STATES):

  * Implemente 'Skeleton Loaders' utilizando 'animate-pulse' do Tailwind CSS para simular o carregamento de dados nas tabelas e cards.
  * Crie telas vazias (Empty States) elegantes com ícone temático e frases instrutivas para abas/módulos sem registros.

\---

## 🗄️ PARTE 2: ARQUITETURA DE BANCO DE DADOS (POSTGRESQL / SUPABASE)

Execute o seguinte esquema SQL para provisionar a estrutura do banco de dados:

```sql
-- Habilitar extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: LIFE\_LOG (Links, Mídias e Notas Rápidas)
CREATE TABLE life\_log (
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  title TEXT NOT NULL,
  url TEXT,
  platform TEXT DEFAULT 'web', -- Opções: 'youtube', 'instagram', 'note', 'web'
  summary TEXT,
  tags TEXT\[], -- Array de tags: e.g., ARRAY\['#casa', '#senha', '#rastreio']
  created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA: ASSETS\_MAINTENANCE (Veículos e Equipamentos)
CREATE TABLE assets\_maintenance (
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- Opções: 'carro', 'casa', 'eletronico'
  current\_usage INT DEFAULT 0,
  max\_usage INT DEFAULT 10000,
  unit TEXT DEFAULT 'km', -- Opções: 'km', 'dias', 'meses'
  last\_serviced\_at DATE,
  notes TEXT
);

-- 3. TABELA: MAINTENANCE\_HISTORY (Histórico de Intervenções)
CREATE TABLE maintenance\_history (
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  asset\_id UUID REFERENCES assets\_maintenance(id) ON DELETE CASCADE,
  service\_performed TEXT NOT NULL,
  cost NUMERIC(10, 2) DEFAULT 0.00,
  performed\_at DATE DEFAULT CURRENT\_DATE,
  notes TEXT
);

-- 4. TABELA: PANTRY\_ITEMS (Despensa e Estoque)
CREATE TABLE pantry\_items (
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- Opções: 'alimentacao', 'limpeza', 'higiene'
  level INT DEFAULT 100, -- Percentual: 0 a 100 (Crítico < 25%, Médio 50%, Cheio 100%)
  updated\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA: TRIPS\_PLACES (Viagens e Lugares Salvos)
CREATE TABLE trips\_places (
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- Opções: 'viagem', 'restaurante', 'ponto\_turistico'
  destination TEXT,
  start\_date DATE,
  end\_date DATE,
  details JSONB -- Dados flexíveis: voos, hotéis, itinerários e notas
);

-- 6. TABELA: AGENDA\_INBOX (Agenda e E-mails Importantes)
CREATE TABLE agenda\_inbox (
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- Opções: 'evento', 'email\_critico'
  event\_date TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  status TEXT DEFAULT 'unread' -- Opções: 'unread', 'read', 'archived'
);





PARTE 3: ENDPOINTS DA API \& REGRAS DE BACKEND

As APIs do aplicativo devem ser construídas no diretório /app/api/\* do Next.js App Router:



1\. Ingestão Webhook Hermes Agent

Endpoint: POST /api/webhook/hermes-capture



Função: Recebe links compartilhados via Telegram/WhatsApp (YouTube, Instagram, sites ou texto puro) capturados pelo Hermes Agent e realiza a inserção na tabela life\_log.



Exemplo de Payload:



JSON

{

&#x20; "title": "Título do vídeo ou post",

&#x20; "url": "\[https://instagram.com/p/](https://instagram.com/p/)...",

&#x20; "platform": "instagram",

&#x20; "summary": "Resumo gerado pelo Hermes...",

&#x20; "tags": \["#instagram", "#receita"]

}

2\. Eventos de Manutenção

Endpoint: POST /api/maintenance/event



Função: Cria um novo registro na tabela maintenance\_history e atualiza as colunas last\_serviced\_at e current\_usage do ativo na tabela assets\_maintenance.



3\. Exportação de Lista de Compras

Endpoint: POST /api/pantry/export



Função: Consulta a tabela pantry\_items filtrando os produtos com level <= 25 e dispara uma chamada HTTP POST para o webhook do Hermes Agent (HERMES\_WEBHOOK\_URL) com a lista de compras formatada para envio no WhatsApp.



🔐 PARTE 4: VARIÁVEIS DE AMBIENTE (.env.local)

Snippet de código

\# Conexão com o Banco de Dados PostgreSQL / Supabase

DATABASE\_URL="postgresql://usuario:senha@host:5432/nomedobanco?sslmode=require"



\# Webhooks de Comunicação com o Hermes Agent na VPS

HERMES\_WEBHOOK\_URL="\[https://vps.seu-dominio.com/api/hermes/message](https://vps.seu-dominio.com/api/hermes/message)"

HERMES\_API\_KEY="sua\_chave\_de\_seguranca\_aqui"

⚙️ PARTE 5: REGRAS DE IMPLEMENTAÇÃO TÉCNICA PARA A IA

Estratégia de Conexão: Crie um utilitário central de acesso ao banco em @/lib/db.ts utilizando o cliente do Supabase (@supabase/supabase-js) ou ORM de preferência.



Resiliência e Fallbacks: Caso a variável DATABASE\_URL não esteja definida ou falhe a conexão com o banco, a aplicação deve alternar automaticamente para o estado de Mock Data interno, garantindo que a interface funcione para testes visuais.



Respostas da API: Mantenha padrão de resposta JSON em todos os endpoints:



Success: { "success": true, "data": ... } (HTTP 200/201)



Error: { "success": false, "error": "Mensagem descritiva" } (HTTP 400/500)



PWA \& Cache: Garanta a inclusão do manifesto PWA (manifest.json) e configuração do Service Worker para permitir atalho na tela inicial em smartphones e suporte parcial offline.

