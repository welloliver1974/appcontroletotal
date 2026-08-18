import { useState, useCallback, useEffect } from 'react'
import { Calendar, Mail, Bell, RefreshCw, Loader2 } from 'lucide-react'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/feedback'
import { useAgendaData } from './useAgendaData'
import { CalendarView } from './CalendarView'
import { EventModal } from './EventModal'
import { EmailCard } from './EmailCard'
import { SettingsModal } from './SettingsModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import type { AgendaEvent, InboxEmail } from '@/data/types'
import { api } from '@/data/api'
import { getGoogleCalendarConfig, syncGoogleCalendar } from '@/lib/googleCalendarSync'
import { toast } from '@/stores/toastStore'

function AgendaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card space-y-4 p-5 h-96">
            <Skeleton className="h-8 w-32 rounded-full" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )
}

type Tab = 'calendar' | 'inbox'
type FilterType = 'all' | 'critico' | 'nao-lidos' | 'lidos'

export function AgendaPage() {
  const module = MODULE_BY_ID['agenda']
  const { data, reload, setEvents, setEmails } = useAgendaData()

  const [activeTab, setActiveTab] = useState<Tab>('calendar')
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null)
  const [emailFilter, setEmailFilter] = useState<FilterType>('all')
  const [showOnlyHermes, setShowOnlyHermes] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<'hermes' | 'calendar' | 'backup' | 'webhook' | 'pwa' | 'theme' | 'notifications'>('calendar')
  const [syncingGcal, setSyncingGcal] = useState(false)

  // Auto-sync Google Calendar on mount if enabled
  useEffect(() => {
    const config = getGoogleCalendarConfig()
    if (config.autoSync && config.icalUrl) {
      syncGoogleCalendar().then((res) => {
        if (res.ok && res.count > 0) {
          reload()
        }
      }).catch(() => {})
    }
  }, [reload])

  const handleSyncGoogleCalendar = async () => {
    const config = getGoogleCalendarConfig()
    if (!config.icalUrl) {
      toast.info('Configure seu link iCal do Google Calendar para sincronizar.')
      setSettingsSection('calendar')
      setSettingsOpen(true)
      return
    }

    setSyncingGcal(true)
    const res = await syncGoogleCalendar()
    setSyncingGcal(false)

    if (res.ok) {
      toast.success(`${res.count} compromissos sincronizados com o Google Calendar! 🎉`)
      await reload()
    } else {
      toast.error(res.error || 'Erro ao sincronizar com o Google Calendar.')
    }
  }

  const handleCreateEvent = useCallback(() => {
    setEditingEvent(null)
    setEventModalOpen(true)
  }, [])

  const handleEditEvent = useCallback((event: AgendaEvent) => {
    setEditingEvent(event)
    setEventModalOpen(true)
  }, [])

  const handleSaveEvent = useCallback(async (eventData: Omit<AgendaEvent, 'id'>) => {
    if (editingEvent) {
      await api.update<AgendaEvent>('events', editingEvent.id, eventData)
      setEvents(data!.events.map((e) => (e.id === editingEvent.id ? { ...e, ...eventData } : e)))
    } else {
      const created = await api.create<AgendaEvent>('events', eventData)
      setEvents([...data!.events, created])
    }
  }, [editingEvent, data, setEvents])

  const handleMarkEmailRead = useCallback(async (id: string, read: boolean) => {
    const email = data!.emails.find((e) => e.id === id)
    if (!email) return
    await api.update<InboxEmail>('emails', id, { read })
    setEmails(data!.emails.map((e) => (e.id === id ? { ...e, read } : e)))
  }, [data, setEmails])

  const handleDeleteEmail = useCallback(async (id: string) => {
    await api.remove('emails', id)
    setEmails(data!.emails.filter((e) => e.id !== id))
  }, [data, setEmails])

  const filteredEmails = data?.emails.filter((email) => {
    if (emailFilter === 'critico' && email.importance !== 'critico') return false
    if (emailFilter === 'nao-lidos' && email.read) return false
    if (emailFilter === 'lidos' && !email.read) return false
    if (showOnlyHermes && !email.from.includes('Hermes')) return false
    return true
  }) ?? []

  const unreadCount = data?.emails.filter((e) => !e.read).length ?? 0
  const criticalCount = data?.emails.filter((e) => e.importance === 'critico' && !e.read).length ?? 0

  return (
    <div className="space-y-5 pb-10 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader module={module} />
        
        {/* Quick Sync Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSyncGoogleCalendar}
            disabled={syncingGcal}
            className="h-9 px-3 text-xs bg-zinc-900/60 border border-zinc-800 hover:border-blue-500/40 hover:bg-blue-500/10 text-zinc-300 hover:text-blue-300 transition-colors gap-2"
          >
            {syncingGcal ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
                <span className="hidden sm:inline">Google Calendar</span>
                <span className="sm:hidden">Sync</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="h-9 px-3 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Configurações
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 bg-zinc-900/50 rounded-xl p-1 border border-zinc-800">
        <Button
          variant={activeTab === 'calendar' ? 'primary' : 'ghost'}
          size="sm"
          className="flex-1 flex items-center justify-center gap-2"
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar className="h-4 w-4" />
          Agenda
        </Button>
        <Button
          variant={activeTab === 'inbox' ? 'primary' : 'ghost'}
          size="sm"
          className="flex-1 flex items-center justify-center gap-2 relative"
          onClick={() => setActiveTab('inbox')}
        >
          <Mail className="h-4 w-4" />
          Inbox
          {(unreadCount > 0 || criticalCount > 0) && (
            <span className={cn(
              'absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1.5 text-[10px] font-medium flex items-center justify-center',
              criticalCount > 0 ? 'bg-rose-500 text-zinc-900' : 'bg-blue-500 text-zinc-900'
            )}>
              {criticalCount > 0 ? criticalCount : unreadCount}
            </span>
          )}
        </Button>
      </div>

      {!data ? (
        <AgendaSkeleton />
      ) : (
        <div className="flex-1">
          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="flex flex-col">
              <CalendarView
                events={data.events}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
              />
            </div>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && (
            <div className="h-full flex flex-col">
              {/* Inbox Toolbar */}
              <div className="flex items-center justify-between gap-4 p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-zinc-100">Emails</h3>
                  {criticalCount > 0 && (
                    <Badge className="text-xs bg-rose-500/15 text-rose-300 border-rose-500/30">
                      {criticalCount} críticos
                    </Badge>
                  )}
                  {unreadCount > criticalCount && (
                    <Badge className="text-xs bg-blue-500/15 text-blue-300 border-blue-500/30">
                      {unreadCount - criticalCount} não lidos
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
                    {(['all', 'critico', 'nao-lidos', 'lidos'] as FilterType[]).map((f) => (
                      <Button
                        key={f}
                        variant={emailFilter === f ? 'primary' : 'ghost'}
                        size="sm"
                        className="h-8 px-3 text-[11px]"
                        onClick={() => setEmailFilter(f)}
                      >
                        {f === 'all' && 'Todos'}
                        {f === 'critico' && 'Críticos'}
                        {f === 'nao-lidos' && 'Não lidos'}
                        {f === 'lidos' && 'Lidos'}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant={showOnlyHermes ? 'primary' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => setShowOnlyHermes(!showOnlyHermes)}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Hermes
                  </Button>
                </div>
              </div>

              {/* Email List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredEmails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Mail className="h-12 w-12 text-zinc-600 mb-4" />
                    <h4 className="font-medium text-zinc-100 mb-1">
                      {emailFilter !== 'all' || showOnlyHermes ? 'Nenhum email encontrado' : 'Inbox vazio'}
                    </h4>
                    <p className="text-zinc-500 text-sm">
                      {emailFilter !== 'all' || showOnlyHermes
                        ? 'Tente alterar os filtros'
                        : 'Emails aparecerão aqui quando chegarem'}
                    </p>
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <EmailCard
                      key={email.id}
                      email={email}
                      onMarkRead={handleMarkEmailRead}
                      onDelete={handleDeleteEmail}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Event Modal */}
      {eventModalOpen && (
        <EventModal
          event={editingEvent}
          onClose={() => {
            setEventModalOpen(false)
            setEditingEvent(null)
          }}
          onSave={handleSaveEvent}
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          open={settingsOpen}
          initialSection={settingsSection}
          onClose={() => {
            setSettingsOpen(false)
            reload()
          }}
        />
      )}
    </div>
  )
}