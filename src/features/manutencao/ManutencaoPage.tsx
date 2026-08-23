import { useEffect, useState } from 'react'
import { Fuel, Plus, Wrench } from 'lucide-react'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/feedback'
import { api } from '@/data/api'
import type { Asset, MaintenanceRecord } from '@/data/types'
import { useManutencaoData } from './useManutencaoData'
import { Kpis } from './Kpis'
import { AssetCard } from './AssetCard'
import { RecordsSection } from './RecordsSection'
import { AssetForm, type AssetDraft } from './AssetForm'
import { RecordForm, type RecordDraft } from './RecordForm'
import { FuelLogModal } from './FuelLogModal'
import { VehicleFuelPerformanceCard } from './VehicleFuelPerformanceCard'
import { sortAssetsByUrgency } from './maintUtils'
import { syncMaintenanceRecordToFinance, syncAllUnsyncedMaintenance } from '@/lib/maintFinanceSync'

type AssetFormState = null | { mode: 'new' } | { mode: 'edit'; asset: Asset }
type RecordFormState = null | { mode: 'new'; defaultAssetId?: string } | { mode: 'edit'; record: MaintenanceRecord }

function ManutencaoSkeleton() {
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-3 w-32 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

/** Fase 3 — Manutenção & Ativos: CRUD de ativos, vida útil e histórico de registros. */
export function ManutencaoPage() {
  const module = MODULE_BY_ID['manutencao']
  const { data, reload, setAssets, setRecords } = useManutencaoData()
  const [openAsset, setOpenAsset] = useState<AssetFormState>(null)
  const [openRecord, setOpenRecord] = useState<RecordFormState>(null)
  const [openFuelLog, setOpenFuelLog] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Sync initial unsynced records (both directions)
  useEffect(() => {
    void syncAllUnsyncedMaintenance().then((synced) => {
      if (synced > 0) {
        void reload()
      }
    })
  }, [reload])

  // Keep a selection: default = most urgent asset; fall back after deletes.
  useEffect(() => {
    if (!data) return
    setSelectedId((cur) => {
      if (cur && data.assets.some((a) => a.id === cur)) return cur
      return sortAssetsByUrgency(data.assets)[0]?.id ?? null
    })
  }, [data])

  const saveAsset = async (draft: AssetDraft) => {
    if (!data) return
    if (openAsset?.mode === 'edit') {
      setAssets(await api.update<Asset>('assets', openAsset.asset.id, draft))
    } else {
      const created = await api.create<Asset>('assets', draft)
      setAssets([created, ...data.assets])
    }
    setOpenAsset(null)
  }

  const deleteAsset = async (id: string) => {
    if (!data) return
    const orphans = data.records.filter((r) => r.assetId === id)
    setAssets(await api.remove<Asset>('assets', id))
    for (const r of orphans) {
      setRecords(await api.remove<MaintenanceRecord>('maintenance', r.id))
    }
  }

  const saveRecord = async (draft: RecordDraft) => {
    if (!data) return

    if (openRecord?.mode === 'edit') {
      const updated = await api.update<MaintenanceRecord>('maintenance', openRecord.record.id, {
        assetId: draft.assetId,
        title: draft.title,
        cost: draft.cost,
        date: draft.date,
        odometerKm: draft.odometerKm,
      })
      setRecords(updated)
    } else {
      const created = await api.create<MaintenanceRecord>('maintenance', {
        assetId: draft.assetId,
        title: draft.title,
        cost: draft.cost,
        date: draft.date,
        odometerKm: draft.odometerKm,
      })
      setRecords([created, ...data.records])

      // Sincronizar gasto com Finanças se houver custo e syncFinance não for falso
      if (draft.cost > 0 && draft.syncFinance !== false) {
        await syncMaintenanceRecordToFinance(created, data.assets)
      }

      // Keep the asset's lastMaintenance in sync with the newest record.
      const target = data.assets.find((a) => a.id === created.assetId)
      if (target && (!target.lastMaintenance || created.date > target.lastMaintenance)) {
        setAssets(await api.update<Asset>('assets', target.id, { lastMaintenance: created.date }))
      }
    }

    setOpenRecord(null)
  }

  const deleteRecord = async (id: string) => {
    setRecords(await api.remove<MaintenanceRecord>('maintenance', id))
  }

  return (
    <div className="space-y-6">
      <PageHeader module={module} />

      {!data ? (
        <ManutencaoSkeleton />
      ) : (
        <>
          <Kpis assets={data.assets} records={data.records} />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow">Ativos</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenFuelLog(true)}
                  className="gap-1.5 text-xs text-amber-300 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
                >
                  <Fuel className="h-3.5 w-3.5" />
                  <span>Abastecimento</span>
                </Button>
                <Button variant="primary" size="sm" onClick={() => setOpenAsset({ mode: 'new' })}>
                  <Plus className="h-3.5 w-3.5" /> Novo ativo
                </Button>
              </div>
            </div>
            {data.assets.length === 0 ? (
              <EmptyState
                icon={<Wrench className="h-5 w-5" />}
                title="Nenhum ativo cadastrado"
                description="Cadastre um ativo (carro, casa…) para acompanhar vida útil e manutenções."
                action={
                  <Button variant="primary" size="sm" onClick={() => setOpenAsset({ mode: 'new' })}>
                    <Plus className="h-3.5 w-3.5" /> Novo ativo
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sortAssetsByUrgency(data.assets).map((a) => (
                  <AssetCard
                    key={a.id}
                    asset={a}
                    records={data.records}
                    selected={a.id === selectedId}
                    onSelect={() => setSelectedId(a.id)}
                    onEdit={() => setOpenAsset({ mode: 'edit', asset: a })}
                    onRemove={deleteAsset}
                    onNewRecord={() => {
                      setSelectedId(a.id)
                      setOpenRecord({ mode: 'new', defaultAssetId: a.id })
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {(() => {
            const selectedAsset = data.assets.find((a) => a.id === selectedId)
            const vehicle =
              selectedAsset && (selectedAsset.category === 'carro' || selectedAsset.category === 'moto')
                ? selectedAsset
                : data.assets.find((a) => a.category === 'carro' || a.category === 'moto')

            if (!vehicle) return null
            return (
              <VehicleFuelPerformanceCard
                asset={vehicle}
                records={data.records}
                onOpenFuelModal={() => setOpenFuelLog(true)}
              />
            )
          })()}

          <RecordsSection
            assets={data.assets}
            records={data.records}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNewRecord={() => setOpenRecord({ mode: 'new', defaultAssetId: selectedId ?? undefined })}
            onEditRecord={(r) => setOpenRecord({ mode: 'edit', record: r })}
            onNewAsset={() => setOpenAsset({ mode: 'new' })}
            onRemove={deleteRecord}
          />
        </>
      )}

      {openAsset && (
        <AssetForm
          key={openAsset.mode === 'edit' ? openAsset.asset.id : 'new'}
          mode={openAsset.mode}
          asset={openAsset.mode === 'edit' ? openAsset.asset : undefined}
          onClose={() => setOpenAsset(null)}
          onSubmit={saveAsset}
        />
      )}
      {openRecord && (
        <RecordForm
          key={openRecord.mode === 'edit' ? openRecord.record.id : 'new'}
          assets={data?.assets ?? []}
          defaultAssetId={openRecord.mode === 'new' ? openRecord.defaultAssetId : undefined}
          record={openRecord.mode === 'edit' ? openRecord.record : undefined}
          onClose={() => setOpenRecord(null)}
          onSubmit={saveRecord}
        />
      )}
      {openFuelLog && (
        <FuelLogModal
          open={openFuelLog}
          onClose={() => setOpenFuelLog(false)}
          assets={data?.assets ?? []}
          records={data?.records ?? []}
          onSubmit={saveRecord}
        />
      )}
    </div>
  )
}