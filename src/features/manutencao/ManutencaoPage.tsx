import { ModulePlaceholder } from '../ModulePlaceholder'

export function ManutencaoPage() {
  return (
    <ModulePlaceholder
      moduleId="manutencao"
      planned={[
        'Ativos (Carro / Casa)',
        'Barra de vida útil visual',
        'Histórico de manutenção',
        'Modal de novo registro',
        'Alertas alimentando o Dashboard',
      ]}
    />
  )
}