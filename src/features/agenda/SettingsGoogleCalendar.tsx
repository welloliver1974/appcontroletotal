import { useState, useEffect } from 'react'
import {
  Calendar,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Link2,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  getGoogleCalendarConfig,
  saveGoogleCalendarConfig,
  restoreGoogleCalendarConfigFromDb,
  syncGoogleCalendar,
  type GoogleCalendarConfig,
} from '@/lib/googleCalendarSync'
import { toast } from '@/stores/toastStore'

export function SettingsGoogleCalendar({ onSyncSuccess }: { onSyncSuccess?: () => void }) {
  const [config, setConfig] = useState<GoogleCalendarConfig>(() => getGoogleCalendarConfig())
  const [syncing, setSyncing] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; count?: number; error?: string } | null>(null)

  useEffect(() => {
    if (!config.icalUrl) {
      void restoreGoogleCalendarConfigFromDb().then((restored) => {
        if (restored.icalUrl) {
          setConfig(restored)
        }
      })
    }
  }, [config.icalUrl])

  const handleSaveUrl = (url: string) => {
    const next = { ...config, icalUrl: url.trim() }
    setConfig(next)
    saveGoogleCalendarConfig(next)
    setTestResult(null)
  }

  const handleToggleAutoSync = (enabled: boolean) => {
    const next = { ...config, autoSync: enabled }
    setConfig(next)
    saveGoogleCalendarConfig(next)
    toast.info(enabled ? 'Sincronização automática ativada!' : 'Sincronização automática desativada.')
  }

  const handleSyncNow = async () => {
    if (!config.icalUrl) {
      toast.warning('Cole o link iCal do Google Calendar primeiro.')
      return
    }

    setSyncing(true)
    setTestResult(null)

    const res = await syncGoogleCalendar(config.icalUrl)
    setSyncing(false)

    if (res.ok) {
      setTestResult({ ok: true, count: res.count })
      setConfig(getGoogleCalendarConfig())
      toast.success(`${res.count} compromissos sincronizados com o Google Calendar! 🎉`)
      if (onSyncSuccess) onSyncSuccess()
    } else {
      setTestResult({ ok: false, error: res.error })
      toast.error(res.error || 'Falha ao sincronizar com o Google Calendar.')
    }
  }

  return (
    <Card className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-zinc-100 flex items-center gap-2">
              Google Calendar
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                <Sparkles className="h-2.5 w-2.5" /> iCal Feed
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Sincronização automática contínua de eventos e compromissos.
            </p>
          </div>
        </div>

        {config.lastSyncAt && (
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">Última Sincronização</span>
            <span className="text-xs text-zinc-300 font-mono">
              {new Date(config.lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({config.lastEventsCount} eventos)
            </span>
          </div>
        )}
      </div>

      {/* Como pegar o link - Passo a Passo */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-indigo-400" />
            Como obter seu link secreto no Google Calendar:
          </h4>
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            Abrir Google Calendar <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>Acesse o <strong className="text-zinc-200">Google Calendar</strong> no computador.</li>
          <li>No menu lateral esquerdo, passe o mouse sobre sua agenda ➔ clique nos <strong className="text-zinc-200">3 pontinhos</strong> ➔ <strong className="text-zinc-200">Configurações e compart.</strong></li>
          <li>Role a página até <strong className="text-zinc-200">"Integrar agenda"</strong> e copie o <strong className="text-blue-300">"Endereço secreto no formato iCal"</strong>.</li>
        </ol>
      </div>

      {/* Input de URLs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-300">
            Endereço(s) secreto(s) no formato iCal (.ics)
          </label>
          {config.icalUrl && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <Check className="h-3 w-3" /> Configurado
            </span>
          )}
        </div>
        <div className="relative">
          <textarea
            rows={3}
            value={config.icalUrl}
            onChange={(e) => handleSaveUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/seu-email%40gmail.com/private-xxxx/basic.ics&#10;https://calendar.google.com/calendar/ical/esposa%40gmail.com/private-yyyy/basic.ics"
            className="input-base w-full p-2.5 text-xs font-mono resize-y"
          />
        </div>
        <p className="text-[11px] text-zinc-500 leading-tight">
          💡 <strong>Dica Multi-Agendas:</strong> Você pode colar mais de um link (um por linha). Assim o app sincroniza sua agenda e também as agendas compartilhadas (ex: esposa, trabalho, família) ao mesmo tempo!
        </p>
      </div>

      {/* Auto Sync Toggle & Botão Sincronizar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={config.autoSync}
            onChange={(e) => handleToggleAutoSync(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/20"
          />
          <span>Sincronizar automaticamente ao abrir a Agenda</span>
        </label>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSyncNow}
          disabled={syncing || !config.icalUrl}
          className="gap-2"
        >
          {syncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sincronizando...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Sincronizar Google Calendar</span>
            </>
          )}
        </Button>
      </div>

      {/* Status da Sincronização */}
      {testResult && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-3.5 text-xs ${
            testResult.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {testResult.ok ? (
            <>
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Sincronização concluída com sucesso! <strong>{testResult.count}</strong> eventos importados.</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{testResult.error || 'Erro na sincronização.'}</span>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
