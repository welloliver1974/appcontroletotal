import { useState } from 'react'
import { Download, Upload, RefreshCw, AlertCircle, CheckCircle, FileJson, Calendar, ToggleLeft, ToggleRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { db } from '@/lib/db'
import { SEED_VERSION } from '@/data/seed'
import { runManualBackup, runAutomaticBackup } from '@/lib/backupScheduler'
import { DAY_LABELS, useBackupStore } from '@/stores/backupStore'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

const COLLECTIONS = [
  'events',
  'emails',
  'lifeLog',
  'facts',
  'reading',
  'media',
  'assets',
  'maintenance',
  'pantry',
  'trips',
  'places',
  'spending',
  'maintMonths',
  'spendingEntries',
  'fixedBills',
  'habits',
  'docVault',
] as const

type Collection = typeof COLLECTIONS[number]

interface BackupData {
  version: number
  timestamp: string
  collections: Record<Collection, unknown[]>
}

function parseBackup(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (!parsed.collections || !parsed.version) {
          throw new Error('Arquivo de backup inválido: estrutura incorreta')
        }
        resolve(parsed as BackupData)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Erro ao ler arquivo JSON'))
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsText(file)
  })
}

async function restoreBackup(data: BackupData): Promise<{ restored: number; errors: string[] }> {
  const errors: string[] = []
  let restored = 0

  for (const col of COLLECTIONS) {
    const rows = data.collections[col]
    if (!Array.isArray(rows)) {
      errors.push(`${col}: dados ausentes ou inválidos`)
      continue
    }
    try {
      await db.set(col as keyof BackupData['collections'], rows)
      restored++
    } catch (err) {
      errors.push(`${col}: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
    }
  }
  return { restored, errors }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SettingsBackup() {
  const { schedule, setEnabled, setDayOfWeek, setHour } = useBackupStore()

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'reading' | 'success' | 'error'>('idle')
  const [importResult, setImportResult] = useState<{ restored: number; errors: string[] } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportError(null)
      setImportResult(null)
      setImportStatus('idle')
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return
    setImportStatus('reading')
    setImportError(null)
    try {
      const backup = await parseBackup(selectedFile)
      const result = await restoreBackup(backup)
      setImportResult(result)
      setImportStatus(result.errors.length > 0 ? 'error' : 'success')
      if (result.errors.length === 0) {
        toast.success(`${result.restored} coleções restauradas ✓`)
      } else {
        toast.error(`${result.errors.length} erro(s) ao restaurar`)
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao importar backup')
      setImportStatus('error')
      toast.error('Falha ao importar backup')
    }
  }

  const handleExport = () => {
    runManualBackup()
  }

  const handleReset = () => {
    if (confirm('Isso vai apagar TODOS os dados e restaurar o seed original. Tem certeza?')) {
      db.reset()
      window.location.reload()
    }
  }

  const handleScheduleToggle = (enabled: boolean) => {
    setEnabled(enabled)
    if (enabled) {
      toast.info('Backup semanal ativado', { duration: 3000 })
    } else {
      toast.info('Backup semanal desativado', { duration: 3000 })
    }
  }

  const handleAutoBackup = () => {
    runAutomaticBackup()
  }

  const lastBackupDate = schedule.lastBackup ? formatDate(schedule.lastBackup) : 'Nunca'

  return (
    <Card className="space-y-6 p-5">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-rose-400" />
        <div>
          <h3 className="font-medium text-zinc-100">Backup & Restore</h3>
          <p className="text-xs text-zinc-500">Exportar/importar todos os dados do Life OS Hub</p>
        </div>
      </div>

      {/* Manual Backup Section */}
      <div className="space-y-4 border-t border-zinc-800 pt-4">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Backup Manual</h4>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="sm" onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Backup (JSON)
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(true)} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importar Backup
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="flex items-center gap-2 text-rose-400 hover:bg-rose-500/10">
            <RefreshCw className="h-4 w-4" />
            Resetar Dados
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2 p-2 bg-zinc-950/50 rounded-lg">
            <FileJson className="h-3.5 w-3.5" />
            <span>{COLLECTIONS.length} coleções incluídas</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-zinc-950/50 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Versão do schema: v{SEED_VERSION}</span>
          </div>
        </div>
      </div>

      {/* Scheduled Backup Section */}
      <div className="space-y-4 border-t border-zinc-800 pt-4">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Backup Semanal Automático</h4>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label className="flex items-center gap-3">
              <span className={cn(
                'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors',
                schedule.enabled
                  ? 'bg-rose-500 border-rose-500'
                  : 'bg-zinc-700 border-zinc-600',
              )} role="switch" aria-checked={schedule.enabled}>
                <span className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  schedule.enabled ? 'translate-x-5' : 'translate-x-0',
                )} />
              </span>
              <div>
                <p className="text-sm font-medium text-zinc-100">Backup semanal automático</p>
                <p className="text-xs text-zinc-500">
                  {schedule.enabled
                    ? `Toda ${DAY_LABELS[schedule.dayOfWeek]} às ${String(schedule.hour).padStart(2, '0')}:00`
                    : 'Desativado — clique para ativar'}
                </p>
              </div>
            </label>
          </div>
          <Button
            variant={schedule.enabled ? 'ghost' : 'primary'}
            size="sm"
            onClick={() => handleScheduleToggle(!schedule.enabled)}
            className="flex-shrink-0"
          >
            {schedule.enabled ? (
              <>
                <ToggleLeft className="h-4 w-4 mr-1.5" />
                Desativar
              </>
            ) : (
              <>
                <ToggleRight className="h-4 w-4 mr-1.5" />
                Ativar
              </>
            )}
          </Button>
        </div>

        {schedule.enabled && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Dia da semana</label>
                <select
                  value={schedule.dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="input-base w-full text-sm"
                >
                  {DAY_LABELS.map((label: string, idx: number) => (
                    <option key={idx} value={idx}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Horário</label>
                <select
                  value={schedule.hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="input-base w-full text-sm"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Último backup automático: <span className="text-zinc-300 font-mono">{lastBackupDate}</span></span>
              {schedule.backupCount > 0 && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span>Total: <span className="text-zinc-300 font-mono">{schedule.backupCount}</span></span>
                </>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={handleAutoBackup} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Executar backup automático agora
            </Button>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {importModalOpen && (
        <Modal open={true} onClose={() => {
          setImportModalOpen(false)
          setSelectedFile(null)
          setImportStatus('idle')
          setImportResult(null)
          setImportError(null)
        }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-zinc-100">Importar Backup</h4>
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-sm text-zinc-400">
              Selecione um arquivo <code className="font-mono text-zinc-300">.json</code> exportado anteriormente.
              <strong className="text-rose-300"> Isto substituirá todos os dados atuais.</strong>
            </p>

            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="input-base"
            />

            {importStatus === 'reading' && (
              <div className="flex items-center gap-2 text-sm text-cyan-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Lendo arquivo...
              </div>
            )}

            {importStatus === 'success' && (
              <div className="space-y-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle className="h-4 w-4" />
                  <span>Backup importado com sucesso!</span>
                </div>
                <p className="text-zinc-300">{importResult?.restored} coleções restauradas.</p>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="space-y-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-rose-300">
                  <AlertCircle className="h-4 w-4" />
                  <span>Erro ao importar</span>
                </div>
                <p className="text-zinc-300">{importError}</p>
                {importResult && importResult.errors.length > 0 && (
                  <ul className="ml-4 list-disc text-xs text-zinc-400 space-y-1">
                    {importResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImport}
                disabled={!selectedFile || importStatus === 'reading'}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Importar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  )
}