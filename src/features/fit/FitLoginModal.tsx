import { useState } from 'react'
import { Dumbbell, KeyRound, Mail, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useFitStore } from '@/stores/fitStore'

interface Props {
  open: boolean
  onClose: () => void
}

export function FitLoginModal({ open, onClose }: Props) {
  const login = useFitStore((s) => s.login)
  const fitUserEmail = useFitStore((s) => s.fitUserEmail)
  const [email, setEmail] = useState(fitUserEmail || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg('Informe e-mail e senha da sua conta do FitWellHub.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      const res = await login(email, password)
      if (res.ok) {
        setPassword('')
        onClose()
      } else {
        setErrorMsg(res.error || 'Credenciais inválidas ou erro no Supabase do FitWell.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <Dumbbell className="h-4 w-4" />
          <span>Conectar Conta FitWellHub</span>
        </div>
      }
    >
      <form onSubmit={handleConnect} className="space-y-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-100">Sincronização em Nuvem em Tempo Real</p>
            <p className="text-emerald-300/80 mt-0.5">
              Entre com o seu e-mail e senha da sua conta do FitWellHub para desbloquear e carregar todos os seus treinos, pesos e medidas gravados.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            E-mail do FitWellHub
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="email"
              required
              autoFocus
              placeholder="seu-email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-10 w-full text-zinc-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Senha do FitWellHub
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-10 w-full text-zinc-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !email || !password}
            className="bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20"
          >
            {loading ? 'Conectando...' : 'Conectar e Puxar Dados 🚀'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
