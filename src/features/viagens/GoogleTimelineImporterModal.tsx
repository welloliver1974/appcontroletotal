import { useRef, useState } from 'react'
import {
  Briefcase,
  Calendar,
  Check,
  Compass,
  FileJson,
  MapPin,
  Route,
  Upload,
  Users,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { parseGoogleTimeline, type ParsedTimelineTrip } from '@/lib/timelineParser'
import type { Trip, TripKind } from '@/data/types'
import { db } from '@/lib/db'
import { toast } from '@/stores/toastStore'

interface GoogleTimelineImporterModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newTrip: Trip) => void
}

export function GoogleTimelineImporterModal({
  open,
  onClose,
  onSuccess,
}: GoogleTimelineImporterModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedTimelineTrip | null>(null)
  const [kind, setKind] = useState<TripKind>('trabalho')
  const [syncPlaces, setSyncPlaces] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleFile = async (file: File) => {
    try {
      setLoading(true)
      const text = await file.text()
      const res = parseGoogleTimeline(text, kind)
      setParsed(res)
      toast.success('Linha do Tempo lida com sucesso! 🗺️')
    } catch {
      toast.error('Não foi possível ler o arquivo. Certifique-se de usar um JSON da Linha do Tempo.')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!parsed) return

    setLoading(true)
    try {
      const tripId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `trip-${Date.now()}`

      const newTrip: Trip = {
        id: tripId,
        destination: parsed.destination,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        status: 'confirmado',
        kind,
        totalKm: parsed.totalKm || undefined,
        stops: parsed.stops,
      }

      await db.insert('trips', newTrip)

      // Sync discovered cities into places
      if (syncPlaces && parsed.discoveredPlaces.length > 0) {
        for (const p of parsed.discoveredPlaces) {
          const placeId =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `plc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`

          await db.insert('places', {
            id: placeId,
            name: p.name,
            where: p.where,
            visited: true,
            note: `Visitado na viagem a ${parsed.destination} (${parsed.startDate})`,
          })
        }
      }

      toast.success(`Viagem "${parsed.destination}" importada com ${parsed.stops.length} paradas! ✈️`)
      onSuccess(newTrip)
      onClose()
      setParsed(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar a viagem importada.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar Linha do Tempo (Google Maps) 🗺️">
      <div className="space-y-4 pt-1">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".json,.kml,application/json"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
          }}
          className="hidden"
        />

        {!parsed ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 rounded-2xl p-8 text-center transition-all bg-zinc-900/40 space-y-4 cursor-pointer group"
          >
            <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/10 group-hover:scale-105 transition-transform">
              <Upload className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-100">
                Selecione o arquivo da Linha do Tempo
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Aceita arquivos <strong>.json</strong> ou <strong>.kml</strong> exportados do Google Takeout ou Google Maps no celular.
              </p>
            </div>

            <Button
              variant="soft"
              size="sm"
              className="gap-2 text-cyan-300 border-cyan-500/30 bg-cyan-500/10"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              <FileJson className="h-4 w-4" /> Escolher Arquivo JSON / KML
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo da Viagem Identificada */}
            <div className="bg-zinc-900/80 border border-cyan-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5" /> Viagem Identificada
                </span>
                {parsed.totalKm > 0 && (
                  <span className="chip px-2 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 font-bold border-cyan-500/40">
                    <Route className="inline h-3 w-3 mr-1" />
                    {parsed.totalKm} km rodados
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-display text-base font-bold text-zinc-100 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  {parsed.destination}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1 font-mono">
                  <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                  {parsed.startDate} ➔ {parsed.endDate} · ({parsed.stops.length} paradas detectadas)
                </p>
              </div>

              {/* Prévia das Paradas */}
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1 border-t border-zinc-800 pt-2">
                {parsed.stops.slice(0, 5).map((s, i) => (
                  <div key={i} className="text-xs text-zinc-300 flex items-center justify-between py-0.5">
                    <span className="truncate">• {s.title}</span>
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0 ml-2">{s.time}</span>
                  </div>
                ))}
                {parsed.stops.length > 5 && (
                  <p className="text-[10px] text-zinc-500 italic">+ {parsed.stops.length - 5} outras paradas</p>
                )}
              </div>
            </div>

            {/* Classificação da Viagem (Trabalho vs Família) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-200 block">
                Classificar Tipo de Viagem:
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setKind('trabalho')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    kind === 'trabalho'
                      ? 'bg-indigo-500/20 border-indigo-500 text-zinc-100 ring-1 ring-indigo-500/50'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Briefcase className="h-4 w-4 text-indigo-400" />
                    💼 Viagem a Trabalho
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    Foco em Km rodado e itinerário de paradas comerciais.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setKind('familia')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    kind === 'familia'
                      ? 'bg-rose-500/20 border-rose-500 text-zinc-100 ring-1 ring-rose-500/50'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Users className="h-4 w-4 text-rose-400" />
                    👨‍👩‍👧‍👦 Viagem em Família
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    Ativa o Relatório Consolidado de Gastos da Viagem.
                  </p>
                </button>
              </div>
            </div>

            {/* Checkbox de sincronização de cidades */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={syncPlaces}
                onChange={(e) => setSyncPlaces(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-cyan-500 h-4 w-4"
              />
              <span>Adicionar cidades detectadas à lista de <strong>Locais Visitados</strong></span>
            </label>

            {/* Ações */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParsed(null)}
                className="text-xs"
              >
                Trocar Arquivo
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleApply}
                disabled={loading}
                className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20"
              >
                <Check className="h-4 w-4" /> Criar Viagem ({kind === 'trabalho' ? '💼 Trabalho' : '👨‍👩‍👧‍👦 Família'})
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
