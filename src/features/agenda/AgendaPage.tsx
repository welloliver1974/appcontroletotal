import { ModulePlaceholder } from '../ModulePlaceholder'

export function AgendaPage() {
  return (
    <ModulePlaceholder
      moduleId="agenda"
      planned={[
        'Sincronização bidirecional (mock)',
        'Calendário e Inbox',
        'Filtro de prioridade pelo Hermes',
        'Compromissos alimentando o Dashboard',
      ]}
    />
  )
}