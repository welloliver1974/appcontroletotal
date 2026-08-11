import { ModulePlaceholder } from '../ModulePlaceholder'

export function DashboardPage() {
  return (
    <ModulePlaceholder
      moduleId="dashboard"
      planned={[
        'KPIs transversais por módulo',
        'Grid de alertas urgentes',
        'Próximos compromissos (Agenda)',
        'Emails críticos (Inbox Inteligente)',
        'Life Insights com recharts',
      ]}
    />
  )
}