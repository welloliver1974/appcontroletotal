import { ModulePlaceholder } from '../ModulePlaceholder'

export function LifeLogPage() {
  return (
    <ModulePlaceholder
      moduleId="life-log"
      planned={[
        'Timeline de logs pessoais',
        'Visão Artigos com resumo IA (mock)',
        'Cofre de Fatos com tags',
        'Quick-add via header',
      ]}
    />
  )
}