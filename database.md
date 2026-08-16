# 🗄️ Documentação do Banco de Dados — Life OS Hub

Esta documentação descreve a arquitetura e o esquema de tabelas para o **Life OS Hub**. O banco foi projetado para rodar em **PostgreSQL** (seja via Supabase ou container Docker em VPS), suportando a persistência de dados do aplicativo web e as automações via Webhook com o **Hermes Agent**.

---

## 📐 Visão Geral do Esquema

O banco é composto por **6 tabelas principais** e **1 tabela relacional** para histórico:

1. `life_log`: Mídias, links (YouTube/Instagram) e cofre de anotações.
2. `assets_maintenance`: Gestão de ativos (veículos e equipamentos da casa).
3. `maintenance_history`: Histórico de intervenções e custos de manutenção.
4. `pantry_items`: Controle do estoque da despensa e consumo.
5. `trips_places`: Itinerários de viagens, reservas e locais salvos.
6. `agenda_inbox`: Eventos de calendário e e-mails importantes filtrados.

---

## 🛠️ Script SQL de Criação das Tabelas

Execute o código abaixo no **SQL Editor** do seu banco de dados para provisionar a estrutura:

```sql
-- Habilitar extensão para geração de UUIDs (padrão no Supabase / Postgres)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================================================
-- 1. TABELA: LIFE_LOG (Links, Mídias e Notas Rápidas)
-- ======================================================================
CREATE TABLE life_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT,
  platform TEXT DEFAULT 'web', -- Opções: 'youtube', 'instagram', 'note', 'web'
  summary TEXT,
  tags TEXT[], -- Array de tags: e.g., ARRAY['#casa', '#senha', '#rastreio']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================================================
-- 2. TABELA: ASSETS_MAINTENANCE (Veículos e Equipamentos)
-- ======================================================================
CREATE TABLE assets_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- Opções: 'carro', 'casa', 'eletronico'
  current_usage INT DEFAULT 0,
  max_usage INT DEFAULT 10000,
  unit TEXT DEFAULT 'km', -- Opções: 'km', 'dias', 'meses'
  last_serviced_at DATE,
  notes TEXT
);

-- ======================================================================
-- 3. TABELA: MAINTENANCE_HISTORY (Histórico de Intervenções)
-- ======================================================================
CREATE TABLE maintenance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets_maintenance(id) ON DELETE CASCADE,
  service_performed TEXT NOT NULL,
  cost NUMERIC(10, 2) DEFAULT 0.00,
  performed_at DATE DEFAULT CURRENT_DATE,
  notes TEXT
);

-- ======================================================================
-- 4. TABELA: PANTRY_ITEMS (Despensa e Estoque)
-- ======================================================================
CREATE TABLE pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- Opções: 'alimentacao', 'limpeza', 'higiene'
  level INT DEFAULT 100, -- Percentual de nível: 0 a 100
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================================================
-- 5. TABELA: TRIPS_PLACES (Viagens e Restaurantes)
-- ======================================================================
CREATE TABLE trips_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- Opções: 'viagem', 'restaurante', 'ponto_turistico'
  destination TEXT,
  start_date DATE,
  end_date DATE,
  details JSONB -- Dados flexíveis: voos, hotéis, notas e listas
);

-- ======================================================================
-- 6. TABELA: AGENDA_INBOX (Agenda e E-mails Importantes)
-- ======================================================================
CREATE TABLE agenda_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- Opções: 'evento', 'email_critico'
  event_date TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  status TEXT DEFAULT 'unread' -- Opções: 'unread', 'read', 'archived'
);