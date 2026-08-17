-- ============================================================================
-- Life OS Hub — Supabase Migration: Text IDs Compatibility
-- ============================================================================
-- The React/localStorage model uses stable text ids like "evt-1" and "log-1".
-- This converts any previously-created UUID id columns to TEXT so SQL seed data
-- and browser-created rows share the same shape.
-- ============================================================================

ALTER TABLE IF EXISTS maintenance DROP CONSTRAINT IF EXISTS maintenance_asset_id_fkey;
ALTER TABLE IF EXISTS trip_stops DROP CONSTRAINT IF EXISTS trip_stops_trip_id_fkey;

ALTER TABLE IF EXISTS events ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS emails ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS life_log ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS facts ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS reading ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS media ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS assets ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS maintenance ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS maintenance ALTER COLUMN asset_id TYPE TEXT USING asset_id::TEXT;
ALTER TABLE IF EXISTS pantry ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS trips ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS trip_stops ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS trip_stops ALTER COLUMN trip_id TYPE TEXT USING trip_id::TEXT;
ALTER TABLE IF EXISTS places ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS spending ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE IF EXISTS maint_months ALTER COLUMN id TYPE TEXT USING id::TEXT;

ALTER TABLE IF EXISTS maintenance
  ADD CONSTRAINT maintenance_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS trip_stops
  ADD CONSTRAINT trip_stops_trip_id_fkey
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
