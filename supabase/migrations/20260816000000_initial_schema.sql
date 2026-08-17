-- ============================================================================
-- Life OS Hub — Supabase Migration: Initial Schema
-- Created: 2026-08-16
-- ============================================================================
-- This migration creates all tables needed for the 6 modules of Life OS Hub.
-- Collections match the mock localStorage keys used in the application.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MODULE: AGENDA & INBOX
-- ============================================================================

-- events: Calendar events (AgendaEvent)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL, -- YYYY-MM-DD
  time_start TIME NOT NULL, -- HH:mm
  time_end TIME,
  category TEXT NOT NULL CHECK (category IN ('reuniao', 'pessoal', 'habit', 'viagem')),
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- emails: Smart inbox emails (InboxEmail)
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  from_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview TEXT NOT NULL,
  importance TEXT NOT NULL CHECK (importance IN ('critico', 'normal')),
  sent_at TIMESTAMPTZ NOT NULL,
  tags TEXT[] DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: LIFE-LOG & LEITURA
-- ============================================================================

-- life_log: Journal entries (LifeLogEntry)
CREATE TABLE IF NOT EXISTS life_log (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  mood SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- facts: Quick facts / vault (Fact)
CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- reading: Books / articles being read (ReadingEntry)
CREATE TABLE IF NOT EXISTS reading (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('lendo', 'encerrado')),
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  note TEXT,
  tags TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- media: YouTube / Instagram links with AI summaries (MediaItem)
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('youtube', 'instagram')),
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  source_label TEXT NOT NULL,
  thumbnail TEXT,
  summary TEXT NOT NULL,
  minutes SMALLINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('salvo', 'consumido')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: MANUTENÇÃO & ATIVOS
-- ============================================================================

-- assets: Vehicles and home equipment (Asset)
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('carro', 'casa')),
  life_pct SMALLINT NOT NULL DEFAULT 100 CHECK (life_pct BETWEEN 0 AND 100),
  next_maintenance DATE NOT NULL,
  last_maintenance DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- maintenance: Maintenance history (MaintenanceRecord)
CREATE TABLE IF NOT EXISTS maintenance (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  odometer_km INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: CONSUMO & DESPENSA
-- ============================================================================

-- pantry: Stock items (PantryItem)
CREATE TABLE IF NOT EXISTS pantry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  qty NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  low_threshold NUMERIC(10, 2) NOT NULL DEFAULT 0,
  expires_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: VIAGENS & EXPERIÊNCIAS
-- ============================================================================

-- trips: Trip itineraries (Trip)
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planejado', 'confirmado', 'realizado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- trip_stops: Itinerary stops per trip (TripStop)
CREATE TABLE IF NOT EXISTS trip_stops (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day SMALLINT NOT NULL CHECK (day > 0),
  time TIME,
  title TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- places: Saved places / bucket list (Place)
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  where_text TEXT NOT NULL,
  visited BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODULE: DASHBOARD — Analytics / Insights
-- ============================================================================

-- spending: Weekly spending data (WeeklySpending)
CREATE TABLE IF NOT EXISTS spending (
  id TEXT PRIMARY KEY,
  week DATE NOT NULL, -- Monday of the week
  despensa NUMERIC(10, 2) NOT NULL DEFAULT 0,
  manutencao NUMERIC(10, 2) NOT NULL DEFAULT 0,
  viagens NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- maint_months: Monthly maintenance counts (MaintMonth)
CREATE TABLE IF NOT EXISTS maint_months (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL, -- 'YYYY-MM'
  count SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Agenda & Inbox
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_importance ON emails(importance);
CREATE INDEX IF NOT EXISTS idx_emails_read ON emails(read);

-- Life-Log
CREATE INDEX IF NOT EXISTS idx_life_log_created_at ON life_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facts_created_at ON facts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_updated_at ON reading(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_kind ON media(kind);

-- Manutenção
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset_id ON maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance(date DESC);

-- Despensa
CREATE INDEX IF NOT EXISTS idx_pantry_category ON pantry(category);

-- Viagens
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_id ON trip_stops(trip_id);
CREATE INDEX IF NOT EXISTS idx_places_visited ON places(visited);

-- Dashboard
CREATE INDEX IF NOT EXISTS idx_spending_week ON spending(week DESC);
CREATE INDEX IF NOT EXISTS idx_maint_months_month ON maint_months(month);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on all tables. Policies can be added later for multi-user support.
-- For now, using anon key with service role for full access in development.

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending ENABLE ROW LEVEL SECURITY;
ALTER TABLE maint_months ENABLE ROW LEVEL SECURITY;

-- Default policy: allow all operations for authenticated and anon (dev mode)
-- Replace with proper policies when adding auth
DROP POLICY IF EXISTS "Allow all for development" ON events;
DROP POLICY IF EXISTS "Allow all for development" ON emails;
DROP POLICY IF EXISTS "Allow all for development" ON life_log;
DROP POLICY IF EXISTS "Allow all for development" ON facts;
DROP POLICY IF EXISTS "Allow all for development" ON reading;
DROP POLICY IF EXISTS "Allow all for development" ON media;
DROP POLICY IF EXISTS "Allow all for development" ON assets;
DROP POLICY IF EXISTS "Allow all for development" ON maintenance;
DROP POLICY IF EXISTS "Allow all for development" ON pantry;
DROP POLICY IF EXISTS "Allow all for development" ON trips;
DROP POLICY IF EXISTS "Allow all for development" ON trip_stops;
DROP POLICY IF EXISTS "Allow all for development" ON places;
DROP POLICY IF EXISTS "Allow all for development" ON spending;
DROP POLICY IF EXISTS "Allow all for development" ON maint_months;

CREATE POLICY "Allow all for development" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON emails FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON life_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON facts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON reading FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON media FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON maintenance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON pantry FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON trip_stops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON places FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON spending FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON maint_months FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- REALTIME PUBLICATION (optional - for live updates)
-- ============================================================================
-- Uncomment to enable realtime subscriptions
-- ALTER PUBLICATION supabase_realtime ADD TABLE events, emails, life_log, facts, reading, media, assets, maintenance, pantry, trips, trip_stops, places, spending, maint_months;
