import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/data/api'
import type { AgendaEvent, InboxEmail } from '@/data/types'

export interface AgendaData {
  events: AgendaEvent[]
  emails: InboxEmail[]
}

export function useAgendaData() {
  const [data, setData] = useState<AgendaData | null>(null)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    const [events, emails] = await Promise.all([
      api.list<AgendaEvent>('events'),
      api.list<InboxEmail>('emails'),
    ])
    if (alive.current) setData({ events, emails })
  }, [])

  useEffect(() => {
    alive.current = true
    void reload()
    return () => {
      alive.current = false
    }
  }, [reload])

  const setEvents = useCallback((events: AgendaEvent[]) => setData((d) => (d ? { ...d, events } : d)), [])
  const setEmails = useCallback((emails: InboxEmail[]) => setData((d) => (d ? { ...d, emails } : d)), [])

  return { data, reload, setEvents, setEmails }
}