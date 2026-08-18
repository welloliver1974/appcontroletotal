import type { AgendaEvent, PantryItem } from '@/data/types'

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

/**
 * Checks for pantry items expiring in ≤ 3 days and alerts the user.
 */
export function checkPantryExpiringNotifications(items: PantryItem[]): void {
  if (getNotificationPermission() !== 'granted') return

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  const expiring = items.filter((item) => {
    if (!item.expiresAt) return false
    const exp = new Date(item.expiresAt)
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 3
  })

  if (expiring.length > 0) {
    try {
      const sessionKey = `act.notif.pantry.${todayStr}.${expiring.length}`
      if (sessionStorage.getItem(sessionKey)) return
      sessionStorage.setItem(sessionKey, '1')
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
 * Checks for events scheduled for today and alerts the user.
 */
export function checkTodayEventsNotifications(events: AgendaEvent[]): void {
  if (getNotificationPermission() !== 'granted') return

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const localToday = `${y}-${m}-${d}`

  const todayEvents = events
    .filter((e) => e.date === localToday)
    .sort((a, b) => a.timeStart.localeCompare(b.timeStart))

  if (todayEvents.length > 0) {
    try {
      const sessionKey = `act.notif.events.${localToday}.${todayEvents.length}`
      if (sessionStorage.getItem(sessionKey)) return
      sessionStorage.setItem(sessionKey, '1')
    } catch {}

    const count = todayEvents.length
    const first = todayEvents[0]
    sendLocalNotification(`📅 Agenda de Hoje (${count} compromisso${count > 1 ? 's' : ''})`, {
      body: `Próximo: ${first.title}${first.timeStart ? ` às ${first.timeStart}` : ''}${first.location ? ` (${first.location})` : ''}`,
      tag: 'today-events',
    })
  }
}
