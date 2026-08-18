import { db } from './db'
import type { AgendaEvent, PantryItem } from '@/data/types'

export interface ExecutedAction {
  type: 'pantry_add' | 'spending_add' | 'event_add' | 'lifelog_add'
  description: string
  success: boolean
  data?: unknown
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

/**
 * Parses and executes actions returned by Hermes in format:
 * ACTION: {"action": "pantry_add", "payload": {...}}
 */
export async function extractAndExecuteHermesActions(replyText: string): Promise<{
  cleanedReply: string
  actions: ExecutedAction[]
}> {
  const actions: ExecutedAction[] = []
  const actionRegex = /ACTION:\s*(\{.*?\})/gi
  let cleanedReply = replyText

  const matches = [...replyText.matchAll(actionRegex)]

  for (const match of matches) {
    try {
      const fullTag = match[0]
      const jsonStr = match[1]
      const parsed = JSON.parse(jsonStr)

      cleanedReply = cleanedReply.replace(fullTag, '').trim()

      if ((parsed.action === 'pantry_add' || parsed.action === 'shopping_add') && parsed.payload?.name) {
        const rawName = String(parsed.payload.name).trim()
        const toBuy = parsed.action === 'shopping_add' || parsed.payload.toBuy !== false || parsed.payload.qty === 0
        const desiredCount = Number(
          parsed.payload.quantityToBuy ||
          parsed.payload.lowThreshold ||
          parsed.payload.quantity ||
          parsed.payload.qty ||
          parsed.payload.minQuantity ||
          1,
        )

        const item: PantryItem = {
          id: uid(),
          name: rawName,
          category: parsed.payload.category || 'Alimentos',
          qty: toBuy ? 0 : desiredCount,
          unit: parsed.payload.unit || 'un',
          lowThreshold: toBuy ? Math.max(1, desiredCount) : 1,
          expiresAt: parsed.payload.expiresAt,
        }
        await db.insert('pantry', item)
        actions.push({
          type: 'pantry_add',
          description: toBuy
            ? `Adicionado à lista de compras: ${item.name} (${item.lowThreshold} ${item.unit} a comprar)`
            : `Adicionado ao estoque da despensa: ${item.name} (${item.qty} ${item.unit})`,
          success: true,
          data: item,
        })
      } else if (parsed.action === 'spending_add' && parsed.payload?.amount) {
        const spendingItem = {
          id: uid(),
          amount: Number(parsed.payload.amount),
          category: parsed.payload.category || 'Alimentação',
          note: parsed.payload.note || 'Despesa registrada pelo Hermes',
          date: parsed.payload.date || new Date().toISOString().slice(0, 10),
        }
        await db.insert('spending', spendingItem)
        actions.push({
          type: 'spending_add',
          description: `Gasto registrado: R$ ${spendingItem.amount.toFixed(2)} (${spendingItem.category})`,
          success: true,
          data: spendingItem,
        })
      } else if (parsed.action === 'event_add' && parsed.payload?.title) {
        const event: AgendaEvent = {
          id: uid(),
          title: String(parsed.payload.title),
          date: parsed.payload.date || new Date().toISOString().slice(0, 10),
          timeStart: parsed.payload.timeStart || '09:00',
          timeEnd: parsed.payload.timeEnd,
          category: parsed.payload.category || 'pessoal',
          location: parsed.payload.location,
        }
        await db.insert('events', event)
        actions.push({
          type: 'event_add',
          description: `Evento agendado: ${event.title} (${event.date} às ${event.timeStart})`,
          success: true,
          data: event,
        })
      } else if (parsed.action === 'lifelog_add' && parsed.payload?.title) {
        const log = {
          id: uid(),
          title: String(parsed.payload.title),
          body: String(parsed.payload.body || ''),
          tags: Array.isArray(parsed.payload.tags) ? parsed.payload.tags : ['hermes'],
          mood: (Number(parsed.payload.mood) || 3) as 1 | 2 | 3 | 4 | 5,
          createdAt: new Date().toISOString(),
        }
        await db.insert('lifeLog', log)
        actions.push({
          type: 'lifelog_add',
          description: `Entrada criada no Diário: "${log.title}"`,
          success: true,
          data: log,
        })
      }
    } catch (e) {
      console.warn('[HermesAction] Failed to parse action:', e)
    }
  }

  return { cleanedReply, actions }
}
