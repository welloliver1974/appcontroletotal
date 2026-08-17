import { useState, useEffect } from 'react'
import { Bell, BellOff, Check, Send } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendLocalNotification,
  type NotificationPermissionStatus,
} from '@/lib/notifications'
import { toast } from '@/stores/toastStore'

export function SettingsNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionStatus>('default')

  useEffect(() => {
    setPermission(getNotificationPermission())
  }, [])

  const handleRequest = async () => {
    const res = await requestNotificationPermission()
    setPermission(res)
    if (res === 'granted') {
      toast.success('Notificações ativadas no dispositivo! 🔔')
      sendLocalNotification('🔔 Notificações Ativadas', {
        body: 'O Life OS Hub agora enviará alertas de agenda e vencimento de itens.',
      })
    } else if (res === 'denied') {
      toast.error('Permissão de notificação negada pelo navegador.')
    }
  }

  const handleTest = () => {
    if (permission !== 'granted') {
      toast.warning('Ative as notificações primeiro.')
      return
    }
    const success = sendLocalNotification('⚡ Teste do Life OS Hub', {
      body: 'Notificação nativa disparada com sucesso!',
    })
    if (success) {
      toast.success('Notificação de teste disparada!')
    } else {
      toast.error('Falha ao disparar notificação.')
    }
  }

  return (
    <Card className="space-y-6 p-5">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-indigo-400" />
        <div>
          <h3 className="font-medium text-zinc-100">Notificações & Alertas PWA</h3>
          <p className="text-xs text-zinc-500">Lembretes nativos no celular e computador</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-200">Status das Notificações</p>
            <p className="text-xs text-zinc-500">
              {permission === 'granted'
                ? 'Permissão concedida — você receberá lembretes ativos.'
                : permission === 'denied'
                ? 'Bloqueado no navegador — altere as permissões do site para reativar.'
                : 'Pendente — clique para permitir notificações.'}
            </p>
          </div>
          <div>
            {permission === 'granted' ? (
              <span className="chip border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
                <Check className="h-3.5 w-3.5" /> Ativo
              </span>
            ) : permission === 'denied' ? (
              <span className="chip border-rose-500/30 text-rose-300 bg-rose-500/10">
                <BellOff className="h-3.5 w-3.5" /> Bloqueado
              </span>
            ) : (
              <Button variant="primary" size="sm" onClick={handleRequest}>
                Permitir
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTest}
            disabled={permission !== 'granted'}
            className="flex items-center gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            Testar Notificação Local
          </Button>
        </div>

        <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800 text-[11px] text-zinc-500 space-y-1.5">
          <p><strong className="text-zinc-300">Alertas automáticos inclusos:</strong></p>
          <p>• <strong>Despensa:</strong> Notificação quando alimentos estiverem a ≤ 3 dias do vencimento.</p>
          <p>• <strong>Agenda:</strong> Notificação de compromissos marcados para o dia.</p>
          <p>• <strong>PWA:</strong> Avisos de novas versões disponíveis para atualização instantânea.</p>
        </div>
      </div>
    </Card>
  )
}
