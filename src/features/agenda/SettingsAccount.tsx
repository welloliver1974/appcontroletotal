import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Fingerprint,
  LogOut,
  Mail,
  Shield,
  Smartphone,
  User,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useSupabase } from '@/lib/db'
import {
  disableBiometrics,
  isBiometricsAvailable,
  isBiometricsEnabled,
  isMobileDevice,
  registerBiometrics,
} from '@/lib/biometrics'
import { toast } from '@/stores/toastStore'

export function SettingsAccount() {
  const user = useAuthStore((s) => s.user)
  const userEmail = useAuthStore((s) => s.userEmail)
  const signOut = useAuthStore((s) => s.signOut)

  const [isMobile, setIsMobile] = useState(false)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioEnabled, setBioEnabled] = useState(false)
  const [loadingBio, setLoadingBio] = useState(false)

  useEffect(() => {
    const mobile = isMobileDevice()
    setIsMobile(mobile)
    setBioEnabled(isBiometricsEnabled())

    if (mobile) {
      isBiometricsAvailable().then((avail) => setBioAvailable(avail))
    }
  }, [])

  const handleToggleBiometrics = async () => {
    if (bioEnabled) {
      disableBiometrics()
      setBioEnabled(false)
      toast.info('Biometria desativada neste dispositivo.')
    } else {
      setLoadingBio(true)
      const res = await registerBiometrics(userEmail || 'usuario@lifeos.local')
      setLoadingBio(false)

      if (res.ok) {
        setBioEnabled(true)
        toast.success('Biometria configurada com sucesso no celular! 📱✨')
      } else {
        toast.error(res.error || 'Não foi possível registrar biometria.')
      }
    }
  }

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair da sua conta?')) {
      await signOut()
      toast.info('Sessão encerrada com sucesso.')
    }
  }

  return (
    <Card className="space-y-6 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-zinc-100">Minha Conta & Autenticação</h3>
          <p className="text-xs text-zinc-500">Gerencie seu login e sincronização de dados</p>
        </div>
      </div>

      <div className="space-y-4 border-t border-zinc-800 pt-4">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Usuário Autenticado
            </span>
            <span className="chip text-[10px] bg-emerald-500/15 border-emerald-500/30 text-emerald-300">
              Ativo
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {(userEmail || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-100 truncate">
                {user?.user_metadata?.full_name || (userEmail ? userEmail.split('@')[0] : 'Usuário')}
              </p>
              <p className="text-xs text-zinc-400 flex items-center gap-1 truncate font-mono">
                <Mail className="h-3 w-3 text-zinc-500" />
                {userEmail || 'usuario@lifeos.local'}
              </p>
            </div>
          </div>
        </div>

        {/* Seção de Biometria (Especial para Celular) */}
        {isMobile ? (
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-indigo-400" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-100">
                    Desbloqueio por Biometria (Celular)
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Entre com impressão digital ou Face ID sem digitar senha
                  </p>
                </div>
              </div>
              <span
                className={`chip text-[10px] ${
                  bioEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {bioEnabled ? 'Ativada ✓' : 'Desativada'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-400">
                {bioAvailable
                  ? 'Sensor biométrico detectado neste aparelho.'
                  : 'Aguardando permissão ou sensor biométrico.'}
              </span>
              <Button
                variant={bioEnabled ? 'ghost' : 'primary'}
                size="sm"
                onClick={handleToggleBiometrics}
                disabled={loadingBio}
                className={
                  bioEnabled
                    ? 'text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                    : 'text-xs bg-indigo-600 hover:bg-indigo-500 text-white'
                }
              >
                {bioEnabled ? 'Desativar Biometria' : 'Ativar Biometria'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl flex items-center gap-2.5 text-xs text-zinc-400">
            <Smartphone className="h-4 w-4 text-zinc-500 shrink-0" />
            <span>
              💡 <strong>Biometria no Celular:</strong> Ao abrir o Life OS Hub no seu smartphone,
              você pode ativar o login instantâneo por impressão digital ou Face ID nesta mesma aba.
            </span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2 p-3 bg-zinc-950/50 border border-zinc-800/60 rounded-xl">
            <Shield className="h-4 w-4 text-indigo-400 shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200">Autenticação</p>
              <p className="text-[11px] text-zinc-500">
                {useSupabase ? 'Supabase Auth (Nuvem)' : 'Armazenamento Local Seguro'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-zinc-950/50 border border-zinc-800/60 rounded-xl">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200">Sincronização</p>
              <p className="text-[11px] text-zinc-500">15 coleções ativas e protegidas</p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair da Conta (Logout)</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}

