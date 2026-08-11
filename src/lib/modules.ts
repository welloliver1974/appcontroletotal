import type { LucideIcon } from 'lucide-react'
import {
  CalendarClock,
  Languages,
  LayoutDashboard,
  NotebookPen,
  Plane,
  ShoppingBasket,
  Wrench,
} from 'lucide-react'

export type ModuleId =
  | 'dashboard'
  | 'life-log'
  | 'manutencao'
  | 'despensa'
  | 'viagens'
  | 'ingles'
  | 'agenda'

export type ModuleAccent = 'violet' | 'emerald' | 'orange' | 'purple' | 'cyan' | 'blue' | 'rose'

export interface ModuleDef {
  id: ModuleId
  label: string
  emoji: string
  path: string
  icon: LucideIcon
  /** shorter label used in the mobile bottom bar */
  navLabel?: string
  accent: ModuleAccent
  /** text color — active nav label/icon */
  text: string
  /** solid bg — active nav pills / dots */
  solid: string
  /** soft chip — icon tile backgrounds */
  soft: string
  /** tinted bg — active nav row state ("glow") */
  glow: string
  /** gradient — page headers / brand accents */
  gradient: string
  tag: string
  description: string
}

/** Module identity palette. Keep classes literal — Tailwind can't compile dynamic names. */
export const MODULES: ModuleDef[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    emoji: '📊',
    path: '/dashboard',
    icon: LayoutDashboard,
    accent: 'violet',
    text: 'text-violet-400',
    solid: 'bg-violet-500',
    soft: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    glow: 'bg-violet-500/10',
    gradient: 'from-violet-500 to-purple-500',
    tag: 'Visão geral',
    description: 'KPIs, alertas e insights do seu universo pessoal.',
  },
  {
    id: 'life-log',
    label: 'Life-Log',
    emoji: '📝',
    path: '/life-log',
    icon: NotebookPen,
    accent: 'emerald',
    text: 'text-emerald-400',
    solid: 'bg-emerald-500',
    soft: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    glow: 'bg-emerald-500/10',
    gradient: 'from-emerald-500 to-teal-500',
    tag: 'Anotações & Fatos',
    description: 'Diário pessoal, artigos com resumo IA e cofre de fatos.',
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    emoji: '🛠️',
    path: '/manutencao',
    icon: Wrench,
    accent: 'orange',
    text: 'text-orange-400',
    solid: 'bg-orange-500',
    soft: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    glow: 'bg-orange-500/10',
    gradient: 'from-orange-500 to-amber-500',
    tag: 'Ativos & Cuidados',
    description: 'Carro, casa e ativos com vida útil e histórico.',
  },
  {
    id: 'despensa',
    label: 'Despensa',
    emoji: '🛒',
    path: '/despensa',
    icon: ShoppingBasket,
    accent: 'purple',
    text: 'text-purple-400',
    solid: 'bg-purple-500',
    soft: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    glow: 'bg-purple-500/10',
    gradient: 'from-purple-500 to-fuchsia-500',
    tag: 'Consumo & Estoque',
    description: 'Estoque inteligente e exportação via webhook.',
  },
  {
    id: 'viagens',
    label: 'Viagens',
    emoji: '✈️',
    path: '/viagens',
    icon: Plane,
    accent: 'cyan',
    text: 'text-cyan-400',
    solid: 'bg-cyan-500',
    soft: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    glow: 'bg-cyan-500/10',
    gradient: 'from-cyan-500 to-sky-500',
    tag: 'Experiências',
    description: 'Itinerários cronológicos e locais salvos.',
  },
  {
    id: 'ingles',
    label: 'Inglês',
    emoji: '🇬🇧',
    path: '/ingles',
    icon: Languages,
    accent: 'blue',
    text: 'text-blue-400',
    solid: 'bg-blue-500',
    soft: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    glow: 'bg-blue-500/10',
    gradient: 'from-blue-600 to-indigo-500',
    tag: 'B1 · Sala de Aula',
    description: 'Cursos, lições, quiz, SRS e conversação com Hermes.',
  },
  {
    id: 'agenda',
    label: 'Agenda & Inbox',
    emoji: '📅',
    path: '/agenda',
    icon: CalendarClock,
    navLabel: 'Agenda',
    accent: 'rose',
    text: 'text-rose-400',
    solid: 'bg-rose-500',
    soft: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    glow: 'bg-rose-500/10',
    gradient: 'from-rose-500 to-pink-500',
    tag: 'Hermes Bridge',
    description: 'Sincronização de calendário e inbox inteligente.',
  },
]

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<
  ModuleId,
  ModuleDef
>

export const MODULE_BY_PATH = Object.fromEntries(MODULES.map((m) => [m.path, m])) as Record<
  string,
  ModuleDef
>