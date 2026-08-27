import type { AgendaEvent, PantryItem } from '@/data/types'
import { isEventCompleted } from '@/lib/eventCompletionStore'

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported'

export function getNotificationPermission(): NotificationPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission as NotificationPermissionStatus
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  try {
    const result = await Notification.requestPermission()
    return result as NotificationPermissionStatus
  } catch {
    return 'denied'
  }
}

export function sendLocalNotification(title: string, options?: NotificationOptions): boolean {
  if (getNotificationPermission() !== 'granted') return false

  try {
    // If Service Worker is ready, use showNotification for better PWA support
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-72.png',
          ...options,
        })
      })
      return true
    }

    new Notification(title, {
      icon: '/icons/icon-192.png',
      ...options,
    })
    return true
  } catch {
    return false
  }
}

function parseLocalDate(dateStr: string): Date | null {
  const parts = dateStr.split('-').map(Number)
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0)
}

function getEventMinutes(timeStr?: string): number | null {
  if (!timeStr) return null
  const [h, min] = timeStr.split(':').map(Number)
  if (isNaN(h) || isNaN(min)) return null
  return h * 60 + min
}

/**
 * Checks for pantry items expiring in ≤ 3 days and alerts the user (once per day).
 */
export function checkPantryExpiringNotifications(items: PantryItem[]): void {
  if (getNotificationPermission() !== 'granted') return

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const todayStr = `${y}-${m}-${d}`

  const expiring = items.filter((item) => {
    if (!item.expiresAt || item.qty <= 0) return false
    const expDate = parseLocalDate(item.expiresAt)
    if (!expDate) return false
    const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 3
  })

  if (expiring.length > 0) {
    try {
      const storageKey = `act.notif.pantry.${todayStr}`
      if (localStorage.getItem(storageKey)) return
      localStorage.setItem(storageKey, '1')
    } catch {}

    const names = expiring.slice(0, 3).map((i) => i.name).join(', ')
    const extra = expiring.length > 3 ? ` e mais ${expiring.length - 3} itens` : ''
    sendLocalNotification('⚠️ Alerta da Despensa: Itens Vencendo', {
      body: `${names}${extra} estão próximos da data de validade.`,
      tag: 'pantry-expiring',
    })
  }
}

/**
 * Checks for upcoming events scheduled for today and alerts the user once per day with the actual next event.
 * Never alerts for past or completed events.
 */
export function checkTodayEventsNotifications(events: AgendaEvent[]): void {
  if (getNotificationPermission() !== 'granted') return

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const localToday = `${y}-${m}-${d}`
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // Filter only today's events that are NOT completed and NOT in the past
  const pendingUpcomingEvents = events
    .filter((e) => {
      if (e.date !== localToday) return false
      const isDone = Boolean(e.completed) || isEventCompleted(e.id)
      if (isDone) return false

      const startMin = getEventMinutes(e.timeStart)
      // If event had a start time and it passed more than 10 minutes ago, skip it
      if (startMin !== null && startMin < currentMinutes - 10) {
        return false
      }
      return true
    })
    .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''))

  if (pendingUpcomingEvents.length > 0) {
    try {
      const storageKey = `act.notif.events_summary.${localToday}`
      if (localStorage.getItem(storageKey)) return
      localStorage.setItem(storageKey, '1')
    } catch {}

    const count = pendingUpcomingEvents.length
    const next = pendingUpcomingEvents[0]
    sendLocalNotification(`📅 Agenda de Hoje (${count} compromisso${count > 1 ? 's' : ''} restante${count > 1 ? 's' : ''})`, {
      body: `Próximo: ${next.title}${next.timeStart ? ` às ${next.timeStart}` : ''}${next.location ? ` (${next.location})` : ''}`,
      tag: 'today-events',
    })
  }
}

/**
 * Checks if an event is starting within 15 minutes from now and triggers an alert.
 * Skips completed events and events that have already started.
 */
export function checkUpcomingEventsReminders(events: AgendaEvent[]): void {
  if (getNotificationPermission() !== 'granted') return

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const localToday = `${y}-${m}-${d}`
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const todayEvents = events.filter((e) => e.date === localToday && e.timeStart)

  for (const event of todayEvents) {
    // If event is marked as completed, don't notify
    if (event.completed || isEventCompleted(event.id)) continue

    const startMin = getEventMinutes(event.timeStart)
    if (startMin === null) continue

    const diffMinutes = startMin - currentMinutes

    // Alerta somente se faltar entre 0 e 15 minutos para começar
    if (diffMinutes >= 0 && diffMinutes <= 15) {
      const notifKey = `act.notif.15min.${event.id}.${localToday}`
      try {
        if (localStorage.getItem(notifKey)) continue
        localStorage.setItem(notifKey, '1')
      } catch {}

      const timeText = diffMinutes === 0 ? 'Agora' : `Em ${diffMinutes} min`
      sendLocalNotification(`⏰ ${timeText}: ${event.title}`, {
        body: `Início: ${event.timeStart}${event.location ? ` · Local: ${event.location}` : ''}`,
        tag: `event-reminder-${event.id}`,
      })
    }
  }
}


