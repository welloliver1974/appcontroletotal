/** Shared domain models for all modules. Collections live in localStorage (mock backend). */

export interface AgendaEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  timeStart: string // HH:mm
  timeEnd?: string
  category: 'reuniao' | 'pessoal' | 'habit' | 'viagem'
  location?: string
}

export type EmailImportance = 'critico' | 'normal'

export interface InboxEmail {
  id: string
  from: string
  subject: string
  preview: string
  importance: EmailImportance
  sentAt: string // ISO datetime
  tags: string[]
  read: boolean
}

export interface LifeLogEntry {
  id: string
  title: string
  body: string
  tags: string[]
  mood: 1 | 2 | 3 | 4 | 5
  createdAt: string // ISO
}

export interface Fact {
  id: string
  content: string
  source: string
  tags: string[]
  createdAt: string // ISO
}

export type ReadingStatus = 'lendo' | 'encerrado'

export type MediaKind = 'youtube' | 'instagram'
export type MediaStatus = 'salvo' | 'consumido'

/** Captured YouTube/Instagram link with a mock AI summary (PRD: Artigos & Mídias). */
export interface MediaItem {
  id: string
  kind: MediaKind
  url: string
  title: string
  sourceLabel: string // e.g. "YouTube · @channel"
  thumbnail?: string
  summary: string
  minutes: number // estimated consumption time
  status: MediaStatus
  tags: string[]
  createdAt: string // ISO
}

export interface ReadingEntry {
  id: string
  title: string
  author: string
  status: ReadingStatus
  progress: number // 0..100
  note?: string
  tags: string[]
  updatedAt: string // ISO
}

export type AssetCategory = 'carro' | 'moto' | 'casa' | 'outro'

export interface Asset {
  id: string
  name: string
  category: AssetCategory
  /** 0..100 remaining useful life */
  lifePct?: number
  nextMaintenance?: string // YYYY-MM-DD (opcional)
  lastMaintenance?: string
}

export interface MaintenanceRecord {
  id: string
  assetId: string
  title: string
  cost: number
  date: string // YYYY-MM-DD
  odometerKm?: number
}

export interface PantryItem {
  id: string
  name: string
  category: string
  qty: number
  unit: string
  lowThreshold: number
  expiresAt?: string // YYYY-MM-DD
}

export type TripStatus = 'planejado' | 'confirmado' | 'realizado'
export type TripKind = 'trabalho' | 'familia' | 'pessoal'

export interface TripStop {
  id: string
  /** 1-based day inside the trip window (1..tripLength). */
  day: number
  /** HH:mm, optional — sorting falls back to end of day when missing. */
  time?: string
  title: string
  note?: string
}

export interface Trip {
  id: string
  destination: string
  startDate: string
  endDate: string
  status: TripStatus
  kind?: TripKind
  totalKm?: number
  /** Chronological itinerary, grouped by day. Empty until a stop is added. */
  stops: TripStop[]
}

/** Bucket list of saved places ("locais salvos") with a visited toggle. */
export interface Place {
  id: string
  name: string
  /** city / region, e.g. "Ceará" or "Cananéia — SP" */
  where: string
  visited: boolean
  note?: string
}

/** Weekly "gastos" drift — drives Life Insights on the Dashboard. */
export interface WeeklySpending {
  week: string // YYYY-MM-DD (Monday)
  despensa: number
  manutencao: number
  viagens: number
}

export interface MaintMonth {
  month: string // '2026-06'
  count: number
}

export interface SpendingItem {
  id: string
  amount: number
  category: string
  note: string
  date: string // YYYY-MM-DD
  time?: string // HH:mm
  referenceId?: string
  createdAt?: string
}

export interface FixedBill {
  id: string
  name: string
  amount: number
  dueDay: number // 1..31
  category: string
  paidMonths: string[] // e.g. ['2026-08', '2026-07']
}

export interface DailyHabit {
  id: string
  title: string
  icon?: string
  completedDates: string[] // e.g. ['2026-08-18', '2026-08-17']
  order: number
}

export interface DocVaultItem {
  id: string
  title: string
  category: string // 'veiculo' | 'casa' | 'pessoal' | 'financeiro' | 'saude' | 'geral'
  value: string
  extra?: string
  updatedAt: string
}

/** Indexed document for the Neural Omnibox (mock semantic search). */
export interface SearchDoc {
  id: string
  module: string
  kind: 'anotacao' | 'fato' | 'leitura' | 'midia' | 'ativo' | 'evento' | 'email' | 'item' | 'viagem' | 'gasto' | 'doc'
  title: string
  body: string
  tags: string[]
}