import { Construction } from 'lucide-react'
import { MODULE_BY_ID, type ModuleId } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/feedback'
import { Badge } from '@/components/ui/primitives'

/**
 * Shared "under construction" shell every module shows until its phase lands.
 * Demo inventory: skeleton grid (loading pattern) + planned scope.
 */
export function ModulePlaceholder({ moduleId, planned }: { moduleId: ModuleId; planned: string[] }) {
  const module = MODULE_BY_ID[moduleId]
  return (
    <div className="space-y-6">
      <PageHeader module={module} />
      <EmptyState
        icon={<Construction className="h-6 w-6" />}
        title="Módulo em construção"
        description="A fundação do Life OS Hub está viva. Este módulo chega na próxima fase, com dados reais do seu mock backend."
      />
      <div className="space-y-3">
        <p className="eyebrow">Escopo planejado</p>
        <div className="flex flex-wrap gap-2">
          {planned.map((p) => (
            <Badge key={p}>{p}</Badge>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <p className="eyebrow">Padrão de carregamento (skeleton)</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card space-y-3 p-5">
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-8 w-1/2" />
            <div className="skeleton h-3 w-2/3" />
          </div>
          <div className="card space-y-3 p-5">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-8 w-2/3" />
            <div className="skeleton h-3 w-1/2" />
          </div>
          <div className="card space-y-3 p-5">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-8 w-1/3" />
            <div className="skeleton h-3 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  )
}