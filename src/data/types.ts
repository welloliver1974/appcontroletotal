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

export type AssetCategory = 'carro' | 'casa'

export interface Asset {
  id: string
  name: string
  category: AssetCategory
  /** 0..100 remaining useful life */
  lifePct: number
  nextMaintenance: string // YYYY-MM-DD
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

export interface Trip {
  id: string
  destination: string
  startDate: string
  endDate: string
  status: TripStatus
}

export interface StudySession {
  id: string
  date: string // YYYY-MM-DD
  minutes: number
  area: 'one-english' | 'ingles-free' | 'ingles-srs' | 'ingles-quiz'
  wordsLearned: number
}

/** Weekly "gastos" drift — drives Life Insights on the Dashboard. */
export interface WeeklySpending {
  week: string // YYYY-MM-DD (Monday)
  despensa: number
  manutencao: number
  viagens: number
}

export interface VocabWeek {
  week: string
  words: number
}

export interface MaintMonth {
  month: string // '2026-06'
  count: number
}

/** Indexed document for the Neural Omnibox (mock semantic search). */
export interface SearchDoc {
  id: string
  module: string
  kind: 'anotacao' | 'fato' | 'leitura' | 'ativo' | 'evento' | 'email' | 'item' | 'viagem' | 'lição'
  title: string
  body: string
  tags: string[]
}