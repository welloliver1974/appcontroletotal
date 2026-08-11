import { ModulePlaceholder } from '../ModulePlaceholder'

export function DespensaPage() {
  return (
    <ModulePlaceholder
      moduleId="despensa"
      planned={[
        'Estoque visual por categoria',
        'Sinalização de estoque baixo',
        'CRUD de itens',
        'Exportação de lista via webhook (mock)',
      ]}
    />
  )
}