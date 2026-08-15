import { useState, useEffect } from 'react'
import { Shield, CloudOff, Smartphone, Check, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SettingsBackup } from './SettingsBackup'
import { SettingsWebhook } from './SettingsWebhook'
import { cn } from '@/lib/utils'

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'backup' | 'webhook' | 'pwa'>('backup')

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
              Backup, Webhook Hermes e PWA (modo offline)
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
              <Shield className="h-4.5 w-4.5 flex-shrink-0" />
              <span>Backup & Restore</span>
            </button>
            <button
              role="tab"
              aria-selected={activeSection === 'webhook'}
              onClick={() => setActiveSection('webhook')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeSection === 'webhook'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
              )}
            >
              <Shield className="h-4.5 w-4.5 flex-shrink-0" />
              <span>Webhook Hermes</span>
            </button>
            <button
              role="tab"
              aria-selected={activeSection === 'pwa'}
              onClick={() => setActiveSection('pwa')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeSection === 'pwa'
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
              )}
            >
              <Smartphone className="h-4.5 w-4.5 flex-shrink-0" />
              <span>PWA & Offline</span>
            </button>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {activeSection === 'backup' && <SettingsBackup />}
          {activeSection === 'webhook' && <SettingsWebhook />}
          {activeSection === 'pwa' && <PWASettings />}
        </main>
      </div>
    </div>
  )
}

function PWASettings() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Capture beforeinstallprompt event for manual install button
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setSwRegistration(reg)
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
      })
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstallable(false)
      }
      setDeferredPrompt(null)
    }
  }

  const handleUpdate = () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

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
          <div className="mt-2 space-y-1 text-[11px] text-zinc-500">
            <p>• Chrome/Edge: Menu ��� → "Instalar Life OS Hub" ou ícone + na barra de endereço</p>
            <p>• Safari (iOS): Compartilhar → "Adicionar à Tela de Início"</p>
            <p>• Firefox: Menu ��� → "Instalar"</p>
          </div>
        </details>
      </Card>

      {/* Offline Status */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <CloudOff className={cn('h-5 w-5', isOnline ? 'text-emerald-400' : 'text-rose-400')} />
          <div>
            <h3 className="font-medium text-zinc-100">Modo Offline</h3>
            <p className="text-xs text-zinc-500">Funciona sem conexão via Service Worker + localStorage</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={cn(
            'chip',
            isOnline
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          )}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {updateAvailable && (
            <Button variant="primary" size="sm" onClick={handleUpdate} className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Atualização disponível
            </Button>
          )}
        </div>

        <details className="group">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400 flex items-center gap-1">
            Como funciona o offline
            <Check className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-2 space-y-1 text-[11px] text-zinc-500">
            <p>• Service Worker faz cache de assets estáticos (JS, CSS, fontes, ícones)</p>
            <p>• Dados persistem no localStorage (não precisam de rede)</p>
            <p>• Mutations em offline entram em fila e sincronizam ao voltar online</p>
            <p>• Manifest + icons permitem instalação nativa</p>
          </div>
        </details>
      </Card>

      {/* Service Worker Info */}
      {swRegistration && (
        <Card className="p-5 space-y-3">
          <h4 className="font-medium text-zinc-300">Service Worker</h4>
          <div className="grid gap-3 sm:grid-cols-2 text-[11px] text-zinc-500">
            <div className="p-2 bg-zinc-950/50 rounded-lg">
              <span className="text-zinc-400">Scope:</span>
              <code className="font-mono text-zinc-300 block truncate mt-0.5">{swRegistration.scope}</code>
            </div>
            <div className="p-2 bg-zinc-950/50 rounded-lg">
              <span className="text-zinc-400">Estado:</span>
              <code className="font-mono text-zinc-300 block truncate mt-0.5">
                {swRegistration.active ? 'Active' : swRegistration.waiting ? 'Waiting' : swRegistration.installing ? 'Installing' : 'Unknown'}
              </code>
            </div>
            <div className="p-2 bg-zinc-950/50 rounded-lg">
              <span className="text-zinc-400">Update via cache:</span>
              <code className="font-mono text-zinc-300 block truncate mt-0.5">{swRegistration.updateViaCache}</code>
            </div>
            <div className="p-2 bg-zinc-950/50 rounded-lg">
              <span className="text-zinc-400">Navegador:</span>
              <code className="font-mono text-zinc-300 block truncate mt-0.5">
                {navigator.userAgent.slice(0, 40)}…
              </code>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

// Augment WindowEventMap to include beforeinstallprompt
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}