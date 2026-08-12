import { MapPin, Plus } from 'lucide-react'
import type { Place } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/feedback'
import { PlaceCard } from './PlaceCard'
import { sortPlaces } from './viagensUtils'

/** Saved places ("locais salvos"): bucket list with a visited toggle. */
export function PlacesSection({
  places,
  onNewPlace,
  onToggle,
  onEdit,
  onRemove,
}: {
  places: Place[]
  onNewPlace: () => void
  onToggle: (place: Place) => void
  onEdit: (place: Place) => void
  onRemove: (id: string) => Promise<void> | void
}) {
  const visited = places.filter((p) => p.visited).length

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Locais salvos"
        subtitle={`bucket list · ${places.length} salvos · ${visited} visitados`}
        action={
          <Button variant="primary" size="sm" onClick={onNewPlace}>
            <Plus className="h-3.5 w-3.5" /> Novo lugar
          </Button>
        }
      />

      {places.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<MapPin className="h-5 w-5" />}
            title="Nenhum lugar salvo"
            description="Monte sua bucket list de lugares para conhecer — e marque os que já visitou."
            action={
              <Button variant="primary" size="sm" onClick={onNewPlace}>
                <Plus className="h-3.5 w-3.5" /> Novo lugar
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortPlaces(places).map((p) => (
            <PlaceCard
              key={p.id}
              place={p}
              onToggle={() => onToggle(p)}
              onEdit={() => onEdit(p)}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </Card>
  )
}