import { useState, useEffect } from 'react'
import { Shield, CloudOff, Smartphone, Check, RefreshCw, Wifi, WifiOff, Database, Shield as ShieldIcon, Clock, Download, Bell, Palette } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SettingsBackup } from './SettingsBackup'
import { SettingsWebhook } from './SettingsWebhook'
import { SettingsTheme } from './SettingsTheme'
import { SettingsNotifications } from './SettingsNotifications'
import { cn } from '@/lib/utils'
import { useOfflineQueueStore } from '@/stores/offlineQueueStore'
import { useBackupStore } from '@/stores/backupStore'
import { toast } from '@/stores/toastStore'

function PWASettings() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  const { queue, isOnline, isSyncing, lastSyncResult, retryAll } = useOfflineQueueStore()
  const { schedule } = useBackupStore()

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        setSwRegistration(reg)
        if (reg.waiting) setUpdateAvailable(true)
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
              }
            })
          }
        })
      }
    })
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  const handleUpdate = () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  const handleForceSync = async () => {
    toast.info('Forçando sincronização...', { duration: 3000 })
    await retryAll()
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  const pendingCount = queue.length
  const lastBackupDate = schedule.lastBackup
    ? new Date(schedule.lastBackup).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Nunca'

  return (
    <div className="space-y-4">
      {/* Install Status */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-indigo-400" />
          <div>
            <h3 className="font-medium text-zinc-100">Instalação como App (PWA)</h3>
            <p className="text-xs text-zinc-500">Adicione à tela inicial para experiência nativa</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isStandalone ? (
            <span className="chip bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              📱 Executando como app instalado
            </span>
          ) : isInstallable ? (
            <>
              <span className="chip bg-amber-500/15 text-amber-300 border-amber-500/30">
                Instalação disponível
              </span>
              <Button variant="primary" size="sm" onClick={handleInstall} className="flex items-center gap-2">
                <CloudOff className="h-3.5 w-3.5" />
                Instalar App
              </Button>
            </>
          ) : (
            <span className="chip bg-zinc-700/50 text-zinc-400">
              Instalação não disponível neste navegador
            </span>
          )}
        </div>

        <details className="group">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400 flex items-center gap-1">
            Como instalar manualmente
            <Check className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-2 text-xs text-zinc-400 space-y-1">
            <p><strong>Chrome/Edge (Desktop):</strong> Menu ⋮ → Instalar Life OS Hub</p>
            <p><strong>Chrome (Android):</strong> Menu ⋮ → Adicionar à tela inicial</p>
            <p><strong>Safari (iOS):</strong> Botão Compartilhar □ → Adicionar à Tela de Início</p>
            <p><strong>Firefox:</strong> Menu ☰ → Instalar</p>
          </div>
        </details>
      </Card>

      {/* SW Update */}
      {updateAvailable && (
        <Card className="p-5 bg-amber-500/10 border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-amber-400" />
            <h3 className="font-medium text-zinc-100">Atualização disponível</h3>
          </div>
          <p className="text-sm text-zinc-400">Uma nova versão do app está pronta.</p>
          <Button variant="primary" size="sm" onClick={handleUpdate} className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar agora
          </Button>
        </Card>
      )}

      {/* Offline / Sync Status */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-emerald-400" />
          ) : (
            <WifiOff className="h-5 w-5 text-rose-400" />
          )}
          <div>
            <h3 className="font-medium text-zinc-100">Modo Offline & Sincronização</h3>
            <p className="text-xs text-zinc-500">Status da conexão e fila de alterações pendentes</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className={cn(
            'chip',
            isOnline
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          )}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>

          {pendingCount > 0 && (
            <span className="chip bg-amber-500/15 text-amber-300 border-amber-500/30 flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              {pendingCount} alteração{pendingCount > 1 ? 'ões' : ''} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}

          {isSyncing && (
            <span className="chip bg-cyan-500/15 text-cyan-300 border-cyan-500/30 flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Sincronizando…
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
          <div className="flex items-center gap-2 p-2 bg-zinc-950/50 rounded-lg">
            <Database className="h-3.5 w-3.5 text-zinc-500" />
            <span>Último backup: <span className="text-zinc-300 font-mono ml-1">{lastBackupDate}</span></span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-zinc-950/50 rounded-lg">
            <ShieldIcon className="h-3.5 w-3.5 text-zinc-500" />
            <span>Backups automáticos: <span className="text-zinc-300 font-mono ml-1">{schedule.backupCount}</span></span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-zinc-950/50 rounded-lg">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span>Agendamento: <span className="text-zinc-300 font-mono ml-1">{schedule.enabled ? 'Ativo' : 'Desativado'}</span></span>
          </div>
        </div>

        {lastSyncResult && (
          <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs text-zinc-400">
            <strong className="text-zinc-300">Última sincronização: </strong>
            {lastSyncResult}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            variant={pendingCount > 0 ? 'primary' : 'ghost'}
            size="sm"
            onClick={handleForceSync}
            disabled={isSyncing || pendingCount === 0}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
            {isSyncing ? 'Sincronizando…' : 'Forçar sincronização agora'}
          </Button>

          {isStandalone && (
            <Button variant="ghost" size="sm" onClick={() => toast.info('Cache limpo — recarregue a página', { duration: 3000 })} className="flex items-center gap-2">
              <Download className="h-3.5 w-3.5" />
              Limpar cache SW
            </Button>
          )}
        </div>

        <details className="group">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400 flex items-center gap-1">
            Detalhes da fila ({pendingCount})
            <Check className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          </summary>
          {pendingCount === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Fila vazia — todas as alterações sincronizadas.</p>
          ) : (
            <ul className="mt-2 max-h-48 overflow-y-auto text-[11px] text-zinc-400 space-y-1 font-mono">
              {queue.slice(0, 10).map((q) => (
                <li key={q.id} className="flex items-center gap-2 p-1 bg-zinc-950/50 rounded">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-normal',
                    q.operation === 'create' && 'bg-emerald-500/20 text-emerald-300',
                    q.operation === 'update' && 'bg-cyan-500/20 text-cyan-300',
                    q.operation === 'remove' && 'bg-rose-500/20 text-rose-300',
                  )}>
                    {q.operation.toUpperCase()}
                  </span>
                  <span>{q.collection}</span>
                  <span className="text-zinc-600">({q.attempts}/{3})</span>
                </li>
              ))}
              {queue.length > 10 && (
                <li className="text-zinc-500">…e mais {queue.length - 10} itens</li>
              )}
            </ul>
          )}
        </details>
      </Card>

      {/* Service Worker Info */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <ShieldIcon className="h-5 w-5 text-indigo-400" />
          <div>
            <h3 className="font-medium text-zinc-100">Service Worker</h3>
            <p className="text-xs text-zinc-500">Cache e atualizações em segundo plano</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2 p-2 bg-zinc-950/50 rounded-lg">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>Registrado: <span className="text-zinc-300 font-mono ml-1">{swRegistration ? 'Sim' : 'Não'}</span></span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-zinc-950/50 rounded-lg">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>Ativo: <span className="text-zinc-300 font-mono ml-1">{swRegistration?.active ? 'Sim' : 'Não'}</span></span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-zinc-950/50 rounded-lg">
            <CloudOff className="h-3.5 w-3.5 text-zinc-500" />
            <span>Scope: <span className="text-zinc-300 font-mono ml-1">{swRegistration?.scope ?? 'N/A'}</span></span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-zinc-950/50 rounded-lg">
            <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
            <span>Update mode: <span className="text-zinc-300 font-mono ml-1">autoUpdate</span></span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'backup' | 'webhook' | 'pwa' | 'theme' | 'notifications'>('backup')

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="chip bg-rose-500/15 text-rose-300 border-rose-500/30">
            <Shield className="h-4 w-4" />
            Configurações
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-zinc-50">
              Configurações
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Backup, Webhook Hermes, Temas e Notificações PWA
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="lg:w-56 flex-shrink-0 space-y-1">
          <nav className="space-y-1" role="tablist" aria-label="Configurações">
            <button
              role="tab"
              aria-selected={activeSection === 'backup'}
              onClick={() => setActiveSection('backup')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeSection === 'backup'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
              )}
            >
              <Shield className="h-4 w-4" />
              Backup & Dados
            </button>
            <button
              role="tab"
              aria-selected={activeSection === 'webhook'}
              onClick={() => setActiveSection('webhook')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeSection === 'webhook'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
              )}
            >
              <Smartphone className="h-4 w-4" />
              Hermes Webhook
            </button>
            <button
              role="tab"
              aria-selected={activeSection === 'theme'}
              onClick={() => setActiveSection('theme')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeSection === 'theme'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
              )}
            >
              <Palette className="h-4 w-4" />
              Temas & Visual
            </button>
            <button
              role="tab"
              aria-selected={activeSection === 'notifications'}
              onClick={() => setActiveSection('notifications')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeSection === 'notifications'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
              )}
            >
              <Bell className="h-4 w-4" />
              Notificações
            </button>
            <button
              role="tab"
              aria-selected={activeSection === 'pwa'}
              onClick={() => setActiveSection('pwa')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeSection === 'pwa'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
              )}
            >
              <CloudOff className="h-4 w-4" />
              PWA / Offline
            </button>
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {activeSection === 'backup' && <SettingsBackup />}
          {activeSection === 'webhook' && <SettingsWebhook />}
          {activeSection === 'theme' && <SettingsTheme />}
          {activeSection === 'notifications' && <SettingsNotifications />}
          {activeSection === 'pwa' && <PWASettings />}
        </div>
      </div>
    </div>
  )
}