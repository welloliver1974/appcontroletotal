import { ModulePlaceholder } from '../ModulePlaceholder'

export function ViagensPage() {
  return (
    <ModulePlaceholder
      moduleId="viagens"
      planned={[
        'Itinerário cronológico',
        'Locais salvos',
        'Planejador de viagem (mock)',
        'Status: planejado / confirmado / realizado',
      ]}
    />
  )
}