-- ============================================================================
-- Life OS Hub — Migration: Add user_email column and index to personal tables
-- Allows proper multi-user data isolation between accounts (e.g. Wellington & Silvia)
-- ============================================================================

ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_events_user_email ON events(user_email);

ALTER TABLE IF EXISTS life_log ADD COLUMN IF NOT EXISTS user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_life_log_user_email ON life_log(user_email);

ALTER TABLE IF EXISTS reading ADD COLUMN IF NOT EXISTS user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_reading_user_email ON reading(user_email);

ALTER TABLE IF EXISTS media ADD COLUMN IF NOT EXISTS user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_media_user_email ON media(user_email);

ALTER TABLE IF EXISTS facts ADD COLUMN IF NOT EXISTS user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_facts_user_email ON facts(user_email);
