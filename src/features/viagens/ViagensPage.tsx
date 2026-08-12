import { useState } from 'react'
import { Plane, Plus } from 'lucide-react'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/feedback'
import { api } from '@/data/api'
import { cn } from '@/lib/utils'
import type { Place, Trip, TripStatus, TripStop } from '@/data/types'
import { useViagensData } from './useViagensData'
import { Kpis } from './Kpis'
import { TripCard } from './TripCard'
import { PlacesSection } from './PlacesSection'
import { TripForm, type TripDraft } from './TripForm'
import { StopForm, type StopDraft } from './StopForm'
import { PlaceForm, type PlaceDraft } from './PlaceForm'
import { STATUS, newStopId, sortTrips } from './viagensUtils'

type TripFormState = null | { mode: 'new' } | { mode: 'edit'; trip: Trip }
type StopFormState = null | { tripId: string; mode: 'new' } | { tripId: string; mode: 'edit'; stop: TripStop }
type PlaceFormState = null | { mode: 'new' } | { mode: 'edit'; place: Place }

function ViagensSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-3 w-24 rounded-full" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-3 w-32 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-11/12 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  )
}

/** Fase 5 — Viagens & Experiências: CRUD de viagens, itinerário cronológico e locais salvos. */
export function ViagensPage() {
  const module = MODULE_BY_ID['viagens']
  const { data, setTrips, setPlaces } = useViagensData()
  const [tripForm, setTripForm] = useState<TripFormState>(null)
  const [stopForm, setStopForm] = useState<StopFormState>(null)
  const [placeForm, setPlaceForm] = useState<PlaceFormState>(null)
  const [filter, setFilter] = useState<TripStatus | null>(null)

  const trips = data?.trips ?? []
  // If the active status no longer exists (e.g. last trip deleted), fall back to "all".
  const activeFilter = filter && trips.some((t) => t.status === filter) ? filter : null
  const visible = sortTrips(activeFilter ? trips.filter((t) => t.status === activeFilter) : trips)

  // Stop modal needs the current trip to validate the day window.
  const stopTrip = stopForm ? trips.find((t) => t.id === stopForm.tripId) : undefined

  const saveTrip = async (draft: TripDraft) => {
    if (!data) return
    if (tripForm?.mode === 'edit') {
      setTrips(await api.update<Trip>('trips', tripForm.trip.id, draft))
    } else {
      const created = await api.create<Trip>('trips', { ...draft, stops: [] })
      setTrips([created, ...data.trips])
    }
    setTripForm(null)
  }

  const saveStop = async (draft: StopDraft) => {
    if (!data || !stopForm) return
    const trip = data.trips.find((t) => t.id === stopForm.tripId)
    if (!trip) {
      setStopForm(null)
      return
    }
    let stops: TripStop[]
    if (stopForm.mode === 'edit') {
      stops = trip.stops.map((s) => (s.id === stopForm.stop.id ? { ...s, ...draft } : s))
    } else {
      stops = [...trip.stops, { id: newStopId(), ...draft }]
    }
    setTrips(await api.update<Trip>('trips', trip.id, { stops }))
    setStopForm(null)
  }

  const deleteStop = async (tripId: string, stopId: string) => {
    if (!data) return
    const trip = data.trips.find((t) => t.id === tripId)
    if (trip) {
      setTrips(await api.update<Trip>('trips', trip.id, { stops: trip.stops.filter((s) => s.id !== stopId) }))
    }
  }

  const savePlace = async (draft: PlaceDraft) => {
    if (!data) return
    if (placeForm?.mode === 'edit') {
      setPlaces(await api.update<Place>('places', placeForm.place.id, draft))
    } else {
      const created = await api.create<Place>('places', draft)
      setPlaces([created, ...data.places])
    }
    setPlaceForm(null)
  }

  const togglePlace = async (place: Place) => {
    setPlaces(await api.update<Place>('places', place.id, { visited: !place.visited }))
  }

  const deleteTrip = async (id: string) => {
    setTrips(await api.remove<Trip>('trips', id))
  }

  const deletePlace = async (id: string) => {
    setPlaces(await api.remove<Place>('places', id))
  }

  return (
    <div className="space-y-6">
      <PageHeader module={module} />

      {!data ? (
        <ViagensSkeleton />
      ) : (
        <>
          <Kpis trips={data.trips} places={data.places} />

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="eyebrow">Viagens</p>
              <Button variant="primary" size="sm" onClick={() => setTripForm({ mode: 'new' })}>
                <Plus className="h-3.5 w-3.5" /> Nova viagem
              </Button>
            </div>

            {trips.length >= 2 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilter(null)}
                  className={cn(
                    'chip px-2.5 py-1 text-xs transition-colors',
                    activeFilter === null
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : 'text-zinc-400 hover:bg-white/5',
                  )}
                >
                  Todas
                </button>
                {(Object.keys(STATUS) as TripStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilter(s)}
                    className={cn(
                      'chip px-2.5 py-1 text-xs transition-colors',
                      activeFilter === s
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        : 'text-zinc-400 hover:bg-white/5',
                    )}
                  >
                    {STATUS[s].label}
                  </button>
                ))}
              </div>
            )}

            {trips.length === 0 ? (
              <EmptyState
                icon={<Plane className="h-5 w-5" />}
                title="Nenhuma viagem cadastrada"
                description="Planeje sua próxima aventura: destino, datas, status e itinerário dia a dia."
                action={
                  <Button variant="primary" size="sm" onClick={() => setTripForm({ mode: 'new' })}>
                    <Plus className="h-3.5 w-3.5" /> Nova viagem
                  </Button>
                }
              />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<Plane className="h-5 w-5" />}
                title={`Nenhuma viagem "${STATUS[activeFilter ?? 'planejado'].label.toLowerCase()}"`}
                description="Crie uma viagem com esse status ou mude o filtro."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visible.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onEdit={() => setTripForm({ mode: 'edit', trip })}
                    onRemove={deleteTrip}
                    onNewStop={() => setStopForm({ tripId: trip.id, mode: 'new' })}
                    onEditStop={(stop) => setStopForm({ tripId: trip.id, mode: 'edit', stop })}
                    onRemoveStop={(stopId) => void deleteStop(trip.id, stopId)}
                  />
                ))}
              </div>
            )}
          </div>

          <PlacesSection
            places={data.places}
            onNewPlace={() => setPlaceForm({ mode: 'new' })}
            onToggle={togglePlace}
            onEdit={(place) => setPlaceForm({ mode: 'edit', place })}
            onRemove={deletePlace}
          />
        </>
      )}

      {tripForm && (
        <TripForm
          key={tripForm.mode === 'edit' ? tripForm.trip.id : 'new'}
          mode={tripForm.mode}
          trip={tripForm.mode === 'edit' ? tripForm.trip : undefined}
          onClose={() => setTripForm(null)}
          onSubmit={saveTrip}
        />
      )}
      {stopForm && stopTrip && (
        <StopForm
          key={stopForm.mode === 'edit' ? stopForm.stop.id : 'new'}
          trip={stopTrip}
          mode={stopForm.mode}
          stop={stopForm.mode === 'edit' ? stopForm.stop : undefined}
          onClose={() => setStopForm(null)}
          onSubmit={saveStop}
        />
      )}
      {placeForm && (
        <PlaceForm
          key={placeForm.mode === 'edit' ? placeForm.place.id : 'new'}
          mode={placeForm.mode}
          place={placeForm.mode === 'edit' ? placeForm.place : undefined}
          onClose={() => setPlaceForm(null)}
          onSubmit={savePlace}
        />
      )}
    </div>
  )
}