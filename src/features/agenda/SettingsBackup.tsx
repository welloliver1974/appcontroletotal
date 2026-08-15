import { useState } from 'react'
import { Download, Upload, RefreshCw, AlertCircle, CheckCircle, FileJson, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { db } from '@/data/db'
import { SEED_VERSION } from '@/data/seed'

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
] as const

type Collection = typeof COLLECTIONS[number]

interface BackupData {
  version: number
  timestamp: string
  collections: Record<Collection, unknown[]>
}

function generateBackup(): BackupData {
  const collections: Record<Collection, unknown[]> = {} as Record<Collection, unknown[]>
  for (const col of COLLECTIONS) {
    collections[col] = db.get(col)
  }
  return {
    version: SEED_VERSION,
    timestamp: new Date().toISOString(),
    collections,
  }
}

function downloadJSON(data: BackupData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `act-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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

function restoreBackup(data: BackupData): { restored: number; errors: string[] } {
  const errors: string[] = []
  let restored = 0

  for (const col of COLLECTIONS) {
    const rows = data.collections[col]
    if (!Array.isArray(rows)) {
      errors.push(`${col}: dados ausentes ou inválidos`)
      continue
    }
    try {
      db.set(col, rows)
      restored++
    } catch (err) {
      errors.push(`${col}: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
    }
  }
  return { restored, errors }
}

export function SettingsBackup() {
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
      const result = restoreBackup(backup)
      setImportResult(result)
      setImportStatus(result.errors.length > 0 ? 'error' : 'success')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao importar backup')
      setImportStatus('error')
    }
  }

  const handleExport = () => {
    const backup = generateBackup()
    downloadJSON(backup)
  }

  const handleReset = () => {
    if (confirm('Isso vai apagar TODOS os dados e restaurar o seed original. Tem certeza?')) {
      db.reset()
      window.location.reload()
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-rose-400" />
        <div>
          <h3 className="font-medium text-zinc-100">Backup & Restore</h3>
          <p className="text-xs text-zinc-500">Exportar/importar todos os dados do Life OS Hub</p>
        </div>
      </div>

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

      {/* Import Modal */}
      {importModalOpen && (
        <Modal
          open={true}
          onClose={() => {
            setImportModalOpen(false)
            setSelectedFile(null)
            setImportStatus('idle')
            setImportResult(null)
            setImportError(null)
          }}
          title="Importar Backup"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            {importStatus === 'idle' && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-300">
                  Selecione um arquivo <code className="font-mono text-zinc-400">.json</code> exportado anteriormente.
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="input-base"
                />
                <p className="text-xs text-zinc-500">
                  O backup deve conter as {COLLECTIONS.length} coleções do app. Dados atuais serão substituídos.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="primary" size="sm" onClick={handleImport} disabled={!selectedFile}>
                    Importar
                  </Button>
                </div>
              </div>
            )}

            {importStatus === 'reading' && (
              <div className="flex items-center justify-center py-8 text-zinc-400">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Lendo e validando backup…
              </div>
            )}

            {importStatus === 'success' && importResult && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
                <h4 className="font-medium text-zinc-100">Backup importado com sucesso!</h4>
                <p className="text-sm text-zinc-400">
                  {importResult.restored} coleções restauradas.
                </p>
                <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
                  Recarregar App
                </Button>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-rose-300">Erro na importação</h4>
                    <p className="text-sm text-zinc-400 mt-1">{importError}</p>
                    {importResult && importResult.errors.length > 0 && (
                      <details className="mt-2 text-xs text-zinc-500">
                        <summary className="cursor-pointer">Detalhes ({importResult.errors.length} erros)</summary>
                        <ul className="mt-1 space-y-0.5 list-disc list-inside">
                          {importResult.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setImportStatus('idle')
                    setImportError(null)
                    setImportResult(null)
                    setSelectedFile(null)
                  }}>
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Card>
  )
}