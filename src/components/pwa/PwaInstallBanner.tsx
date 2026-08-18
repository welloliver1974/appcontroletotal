import { useEffect, useState } from 'react'
import { Download, Smartphone, X, Check, Share, PlusSquare } from 'lucide-react'
import { checkStandalone } from '@/lib/pwa'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (checkStandalone()) {
      return
    }

    // Check if dismissed recently
    try {
      const dismissedAt = localStorage.getItem('act.pwa.dismissedAt')
      if (dismissedAt && Date.now() - Number(dismissedAt) < 24 * 60 * 60 * 1000) {
        return
      }
    } catch {}

    // Detect iOS
    const ua = navigator.userAgent || ''
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    setIsIOS(isIosDevice)

    if (isIosDevice) {
      setShowBanner(true)
    }

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true)
      return
    }

    if (!deferredPrompt) {
      toast.info('Para instalar, toque nos 3 pontinhos do navegador e selecione "Adicionar à Tela Inicial". 📲')
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      toast.success('🎉 Life OS Hub instalado com sucesso no celular!')
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    try {
      localStorage.setItem('act.pwa.dismissedAt', String(Date.now()))
    } catch {}
  }

  if (!showBanner) return null

  return (
    <>
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-zinc-900/80 p-3.5 shadow-lg shadow-indigo-950/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                Instalar Life OS no Celular
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  App PWA
                </span>
              </h4>
              <p className="text-[11px] text-zinc-400 truncate">
                Acesse em tela cheia, com biometria e 100% offline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstallClick}
              className="h-8 px-3 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Instalar</span>
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-indigo-400" />
                Como instalar no iPhone / iPad
              </h3>
              <button onClick={() => setShowIOSModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="space-y-3 text-xs text-zinc-300">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">
                  1
                </span>
                <span>
                  No Safari, toque no botão de <strong>Compartilhar <Share className="inline h-3.5 w-3.5 text-sky-400" /></strong> na barra inferior do navegador.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">
                  2
                </span>
                <span>
                  Role um pouco para baixo e toque em <strong>"Adicionar à Tela de Início <PlusSquare className="inline h-3.5 w-3.5 text-zinc-200" />"</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                  <Check className="h-3 w-3" />
                </span>
                <span>
                  Pronto! O ícone do <strong>Life OS Hub</strong> aparecerá junto com seus outros apps.
                </span>
              </li>
            </ol>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs"
            >
              Entendido
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
