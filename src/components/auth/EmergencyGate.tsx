import { useState } from 'react'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { HERMES_CODE, useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

/**
 * Emergency Mode (mock): first launch requires a verification code delivered by
 * the Hermes Agent. In production the code arrives via WhatsApp/Telegram — here
 * it's shown on screen as a demo, and the device is then marked as trusted.
 */
export function EmergencyGate() {
  const verify = useAuthStore((s) => s.verify)
  const trustThisDevice = useAuthStore((s) => s.trustThisDevice)
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const submit = () => {
    if (verify(code)) {
      trustThisDevice()
    } else {
      setError(true)
      setShake(true)
      setCode('')
      setTimeout(() => setShake(false), 400)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div
        className={cn(
          'glass w-full max-w-sm rounded-3xl p-6 sm:p-8',
          shake && 'animate-[shake_0.4s_ease-in-out]',
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-zinc-50">Verificação de segurança</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Este dispositivo ainda não é confiável. O <strong>Hermes Agent</strong> enviou um
            código de verificação para o seu <strong>WhatsApp</strong> e{' '}
            <strong>Telegram</strong>.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">
            Modo demonstração — código
          </p>
          <p className="mt-0.5 font-mono text-2xl font-bold tracking-[0.3em] text-emerald-300">
            {HERMES_CODE}
          </p>
        </div>

        <div className="mt-5">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              setError(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            inputMode="numeric"
            autoFocus
            placeholder="••••"
            aria-label="Código de verificação"
            className={cn(
              'input-base text-center font-mono text-xl tracking-[0.4em]',
              error && 'border-rose-500/60 focus:border-rose-500/70 focus:ring-rose-500/20',
            )}
          />
          {error && (
            <p className="mt-2 text-center text-xs text-rose-400">
              Código incorreto. O Hermes reenviou outro código.
            </p>
          )}
          <Button variant="primary" className="mt-3 w-full" onClick={submit}>
            <ShieldCheck className="h-4 w-4" />
            Verificar e confiar neste dispositivo
          </Button>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-zinc-600">
          Integração real com WhatsApp/Telegram chega numa fase futura. Em produção, o
          Emergency Mode dispara o código pelo Hermes sob demanda.
        </p>
      </div>
    </div>
  )
}