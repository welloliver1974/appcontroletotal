import { useMemo, useState } from 'react'
import {
  ChevronRight,
  Compass,
  DollarSign,
  MapPin,
  Plane,
  ShieldCheck,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Trip } from '@/data/types'
import { Link } from 'react-router-dom'

interface ActiveTripCardProps {
  trips: Trip[]
}

const CURRENCY_RATES = { USD: 5.65, EUR: 6.15 }

export function ActiveTripCard({ trips }: ActiveTripCardProps) {
  const todayStr = new Date().toISOString().slice(0, 10)

  // Identificar viagem em andamento
  const activeTrip = useMemo(() => {
    return trips.find((t) => t.startDate <= todayStr && t.endDate >= todayStr)
  }, [trips, todayStr])

  // Mini conversor de moedas rápido (USD/EUR para BRL)
  const [foreignAmount, setForeignAmount] = useState('10')
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR'>('USD')

  const convertedBrl = useMemo(() => {
    const val = parseFloat(foreignAmount.replace(',', '.')) || 0
    return val * CURRENCY_RATES[selectedCurrency]
  }, [foreignAmount, selectedCurrency])

  if (!activeTrip) return null

  // Calcular dia atual da viagem (1-indexed)
  const startTimestamp = new Date(activeTrip.startDate).getTime()
  const todayTimestamp = new Date(todayStr).getTime()
  const currentDayNumber = Math.max(1, Math.floor((todayTimestamp - startTimestamp) / 86_400_000) + 1)

  const endTimestamp = new Date(activeTrip.endDate).getTime()
  const totalDays = Math.max(1, Math.floor((endTimestamp - startTimestamp) / 86_400_000) + 1)

  // Paradas de hoje
  const todayStops = (activeTrip.stops || []).filter((s) => s.day === currentDayNumber)

  return (
    <Card className="relative overflow-hidden border-cyan-500/40 bg-gradient-to-br from-cyan-950/30 via-zinc-900/90 to-zinc-950 p-4 sm:p-5 shadow-xl shadow-cyan-950/20">
      {/* Glow de fundo */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative space-y-4">
        {/* Header da Viagem Ativa */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-md shadow-cyan-500/10">
              <Plane className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="chip px-2 py-0.2 text-[9px] bg-cyan-500/20 text-cyan-300 font-bold uppercase tracking-wider border-cyan-500/40">
                  Modo Viagem Ativo ✈️
                </span>
                <span className="text-xs font-semibold text-zinc-400">
                  Dia {currentDayNumber} de {totalDays}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-zinc-100 flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-4 w-4 text-cyan-400" />
                {activeTrip.destination}
              </h3>
            </div>
          </div>

          <Link to="/viagens">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-cyan-400 hover:text-cyan-300">
              Ver Roteiro Completo <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Grid: Paradas de Hoje + Conversor Rápido */}
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          {/* Paradas do Dia */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-cyan-400" />
                Programação de Hoje (Dia {currentDayNumber})
              </span>
              <span className="chip px-1.5 py-0.5 text-[10px] text-zinc-400">
                {todayStops.length} parada(s)
              </span>
            </div>

            {todayStops.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-1">
                Nenhuma parada agendada para hoje. Aproveite o dia livre! ✨
              </p>
            ) : (
              <div className="space-y-1.5">
                {todayStops.map((stop) => (
                  <div
                    key={stop.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs"
                  >
                    <span className="font-medium text-zinc-200 truncate">{stop.title}</span>
                    {stop.time && (
                      <span className="font-mono text-[11px] text-cyan-400 font-bold ml-2 shrink-0">
                        {stop.time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversor de Moedas em 1 Toque */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                Conversor de Moedas
              </span>
              <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('USD')}
                  className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                    selectedCurrency === 'USD' ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400'
                  }`}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('EUR')}
                  className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                    selectedCurrency === 'EUR' ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400'
                  }`}
                >
                  EUR
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                  {selectedCurrency === 'USD' ? '$' : '€'}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={foreignAmount}
                  onChange={(e) => setForeignAmount(e.target.value)}
                  placeholder="10"
                  className="w-full pl-7 pr-2 py-1.5 text-xs font-mono font-bold bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <span className="text-xs text-zinc-500">➔</span>

              <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-right">
                <span className="text-[10px] text-emerald-400/80 block">Equivale a:</span>
                <span className="font-display font-num text-xs font-bold text-emerald-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    convertedBrl,
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
              <span>Câmbio aprox: 1 {selectedCurrency} = R$ {CURRENCY_RATES[selectedCurrency].toFixed(2)}</span>
              <Link to="/life-log" className="text-cyan-400 hover:underline flex items-center gap-0.5">
                <ShieldCheck className="h-3 w-3" /> Seguro & Docs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
