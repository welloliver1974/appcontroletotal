-- ============================================================================
-- Life OS Hub — Migration: Configurações Gerais & IA Persistentes na Nuvem
-- Created: 2026-08-19
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS e permitir leitura/escrita para usuários autenticados e chave anon
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to app_settings" ON app_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
