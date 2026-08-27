-- ============================================================================
-- Life OS Hub — Migration: Relax Assets Constraints
-- Allows next_maintenance to be NULL and adds 'moto' & 'outro' categories
-- ============================================================================

-- 1. Relax next_maintenance NOT NULL constraint
ALTER TABLE IF EXISTS assets ALTER COLUMN next_maintenance DROP NOT NULL;

-- 2. Relax category CHECK constraint to allow ('carro', 'moto', 'casa', 'outro')
ALTER TABLE IF EXISTS assets DROP CONSTRAINT IF EXISTS assets_category_check;
ALTER TABLE IF EXISTS assets ADD CONSTRAINT assets_category_check CHECK (category IN ('carro', 'moto', 'casa', 'outro'));
