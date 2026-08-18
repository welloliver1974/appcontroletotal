-- ============================================================================
-- Life OS Hub — Migration: Finanças, Hábitos e Cofre de Documentos
-- Created: 2026-08-18
-- ============================================================================

-- spending_entries: Lançamentos diários de despesas (SpendingItem)
CREATE TABLE IF NOT EXISTS spending_entries (
  id TEXT PRIMARY KEY,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  note TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- fixed_bills: Contas fixas e assinaturas recorrentes (FixedBill)
CREATE TABLE IF NOT EXISTS fixed_bills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  due_day SMALLINT NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 31),
  category TEXT NOT NULL,
  paid_months TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- habits: Checklist diário de hábitos e rotina (DailyHabit)
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  completed_dates TEXT[] DEFAULT '{}',
  "order" SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- doc_vault: Cofre seguro de documentos, chaves e medidas (DocVaultItem)
CREATE TABLE IF NOT EXISTS doc_vault (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  extra TEXT,
  updated_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
