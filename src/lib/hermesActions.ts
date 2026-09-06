import { db } from './db'
import { todayStr } from './utils'
import type { AgendaEvent, PantryItem } from '@/data/types'
import { useFitStore } from '@/stores/fitStore'

export interface ExecutedAction {
  type:
    | 'pantry_add'
    | 'spending_add'
    | 'event_add'
    | 'lifelog_add'
    | 'fit_weight_add'
    | 'fit_measurement_add'
    | 'fit_workout_add'
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

  let match: RegExpExecArray | null
  while ((match = actionRegex.exec(replyText)) !== null) {
    try {
      const fullTag = match[0]
      const parsed = JSON.parse(match[1])

      cleanedReply = cleanedReply.replace(fullTag, '').trim()

      if (parsed.action === 'pantry_add' && parsed.payload?.name) {
        const item: PantryItem = {
          id: uid(),
          name: String(parsed.payload.name),
          qty: Number(parsed.payload.qty) || 1,
          unit: parsed.payload.unit || 'un',
          category: parsed.payload.category || 'Outros',
          lowThreshold: Number(parsed.payload.lowThreshold) || 1,
        }
        await db.insert('pantry', item)
        actions.push({
          type: 'pantry_add',
          description: `Item adicionado à despensa: ${item.name} (${item.qty} ${item.unit})`,
          success: true,
          data: item,
        })
      } else if (parsed.action === 'spending_add' && parsed.payload?.amount) {
        const spendingItem = {
          id: uid(),
          amount: Number(parsed.payload.amount),
          category: parsed.payload.category || 'Alimentação',
          note: parsed.payload.note || 'Despesa registrada pelo Hermes',
          date: parsed.payload.date || todayStr(),
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
          date: parsed.payload.date || todayStr(),
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
      } else if (parsed.action === 'fit_weight_add' && parsed.payload?.weight_kg) {
        const weightKg = Number(parsed.payload.weight_kg)
        const date = parsed.payload.date || todayStr()
        await useFitStore.getState().logWeight(weightKg, date)
        actions.push({
          type: 'fit_weight_add',
          description: `Peso gravado no FitWell: ${weightKg} kg (${date})`,
          success: true,
          data: { weight_kg: weightKg, date },
        })
      } else if (parsed.action === 'fit_measurement_add' && parsed.payload?.label && parsed.payload?.value_cm) {
        const label = String(parsed.payload.label)
        const valueCm = Number(parsed.payload.value_cm)
        const date = parsed.payload.date || todayStr()
        await useFitStore.getState().logMeasurement(label, valueCm, date)
        actions.push({
          type: 'fit_measurement_add',
          description: `Medida ${label} gravada no FitWell: ${valueCm} cm`,
          success: true,
          data: { label, value_cm: valueCm, date },
        })
      } else if (parsed.action === 'fit_workout_add' && parsed.payload?.name) {
        const name = String(parsed.payload.name)
        const notes = parsed.payload.notes ? String(parsed.payload.notes) : undefined
        await useFitStore.getState().logWorkoutSession(name, undefined, notes)
        actions.push({
          type: 'fit_workout_add',
          description: `Treino "${name}" registrado no FitWell`,
          success: true,
          data: { name, notes },
        })
      }
    } catch (e) {
      console.warn('[HermesAction] Failed to parse action:', e)
    }
  }

  return { cleanedReply, actions }
}
