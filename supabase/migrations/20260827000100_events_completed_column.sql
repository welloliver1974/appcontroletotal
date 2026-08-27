-- ============================================================================
-- Life OS Hub — Migration: Add completed column to events table
-- ============================================================================

ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
