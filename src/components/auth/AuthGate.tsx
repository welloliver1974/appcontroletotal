import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  Sparkles,
  User,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'signup' | 'magic' | 'emergency'

export function AuthGate() {
  const {
    signInWithEmail,
    signUpWithEmail,
    sendMagicLink,
    verifyEmergencyCode,
    trustThisDevice,
  } = useAuthStore()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [emergencyCode, setEmergencyCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setError('Preencha seu email e senha.')
          setLoading(false)
          return
        }

        const res = await signInWithEmail(email, password)
        if (res.ok) {
          toast.success(`Bem-vindo ao Life OS Hub! 🎉`)
        } else {
          setError(res.error || 'Email ou senha inválidos.')
        }
      } else if (mode === 'signup') {
        if (!email.trim() || !password) {
          setError('Preencha todos os campos obrigatórios.')
          setLoading(false)
          return
        }

        if (password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres.')
          setLoading(false)
          return
        }

        const res = await signUpWithEmail(email, password, name)
        if (res.ok) {
          toast.success('Conta criada com sucesso! Verifique seu email se a confirmação estiver ativada.')
          setMode('login')
        } else {
          setError(res.error || 'Erro ao criar conta.')
        }
      } else if (mode === 'magic') {
        if (!email.trim()) {
          setError('Digite seu email para receber o link.')
          setLoading(false)
          return
        }

        const res = await sendMagicLink(email)
        if (res.ok) {
          setMagicSent(true)
          toast.success('Link de acesso enviado para o seu email! 📬')
        } else {
          setError(res.error || 'Erro ao enviar link de acesso.')
        }
      } else if (mode === 'emergency') {
        if (verifyEmergencyCode(emergencyCode)) {
          trustThisDevice(email.trim() || 'hermes.admin@lifeos.local')
          toast.success('Dispositivo verificado via código Hermes! 🛡️')
        } else {
          setError('Código de emergência incorreto.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na autenticação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-black/80 space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-bold font-display text-zinc-50 tracking-tight">
            Life OS Hub
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === 'login' && 'Faça login com seu email para acessar seu painel'}
            {mode === 'signup' && 'Crie sua conta pessoal para sincronizar todos os módulos'}
            {mode === 'magic' && 'Entrar sem senha via link direto no seu email'}
            {mode === 'emergency' && 'Acesso rápido com código de verificação Hermes'}
          </p>
        </div>

        {/* Abas de Modo */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-900/90 border border-zinc-800/80 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError(null)
            }}
            className={cn(
              'py-1.5 text-xs font-semibold rounded-lg transition-all',
              mode === 'login'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setError(null)
            }}
            className={cn(
              'py-1.5 text-xs font-semibold rounded-lg transition-all',
              mode === 'signup'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            Cadastrar
          </button>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário */}
        {magicSent ? (
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-100">Verifique seu email!</h3>
            <p className="text-xs text-zinc-300">
              Enviamos um link mágico para <strong>{email}</strong>. Clique nele para entrar
              automaticamente sem precisar de senha.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMagicSent(false)
                setMode('login')
              }}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Voltar ao login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-zinc-400" /> Seu Nome
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Welldson Oliver"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base text-xs"
                />
              </div>
            )}

            {mode !== 'emergency' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" /> Endereço de Email
                </label>
                <input
                  type="email"
                  placeholder="seu-email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base text-xs"
                  required
                  autoFocus
                />
              </div>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-zinc-400" /> Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('magic')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Entrar sem senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-base text-xs pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'emergency' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-amber-400" /> Código Hermes
                </label>
                <input
                  type="text"
                  placeholder="2468"
                  value={emergencyCode}
                  onChange={(e) => setEmergencyCode(e.target.value)}
                  className="input-base text-center font-mono font-bold text-lg tracking-[0.3em]"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-zinc-500 text-center">
                  Código de demonstração: <code className="text-emerald-400 font-bold">2468</code>
                </p>
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={loading}
              className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 font-medium text-sm mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              <span>
                {loading
                  ? 'Processando...'
                  : mode === 'login'
                    ? 'Entrar no Life OS'
                    : mode === 'signup'
                      ? 'Criar Conta'
                      : mode === 'magic'
                        ? 'Enviar Link de Acesso'
                        : 'Validar Código'}
              </span>
            </Button>
          </form>
        )}

        {/* Rodapé com Atalhos */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[11px] text-zinc-500">
          <button
            type="button"
            onClick={() => setMode(mode === 'emergency' ? 'login' : 'emergency')}
            className="hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <Shield className="h-3 w-3" />
            <span>{mode === 'emergency' ? 'Voltar para Email' : 'Código de Emergência'}</span>
          </button>

          {mode === 'magic' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="hover:text-zinc-300 transition-colors"
            >
              Entrar com Senha
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
