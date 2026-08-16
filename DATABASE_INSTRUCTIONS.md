# 🗄️ INSTRUÇÕES DE BANCO DE DADOS E BACKEND PARA A IA (LIFE OS HUB)

Este documento contém todas as especificações técnicas, esquemas SQL, padrões de API e regras de negócios necessários para implementar a persistência de dados e integrações do **Life OS Hub**.

\---

## 🎯 OBJETIVO DA APLICAÇÃO

A aplicação é um **Life OS Hub** (Next.js App Router + Tailwind CSS) conectado a um banco **PostgreSQL / Supabase** e integrado via Webhooks com um assistente externo (**Hermes Agent** rodando em VPS).

\---

## 🛠️ 1. ESQUEMA DO BANCO DE DADOS (PostgreSQL / Supabase)

Execute e utilize o seguinte esquema SQL para criar as tabelas e relacionamentos do projeto:

```sql
-- Habilitar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: LIFE\_LOG (Links, Mídias e Notas Rápidas)
CREATE TABLE life\_log (
  id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),
  title TEXT NOT NULL,
  url TEXT,
  platform TEXT DEFAULT 'web', -- Opções: 'youtube', 'instagram', 'note', 'web'
  summary TEXT,
  tags TEXT\[], -- Exemplo: ARRAY\['#casa', '#senha', '#rastreio']
  created\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA: ASSETS\_MAINTENANCE (Veículos e Equipamentos da Casa)
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

-- 4. TABELA: PANTRY\_ITEMS (Despensa e Consumo)
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

