/**
 * Autonomous Hermes Briefing & Debriefing Dispatcher.
 * Can be executed via Cron (Linux VPS), GitHub Actions, or local Node.js script.
 * Runs 24/7 independently even when the web app is closed.
 * 
 * Usage:
 *   node scripts/dispatchBriefing.mjs morning
 *   node scripts/dispatchBriefing.mjs night
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

// Auto-load .env if exists
try {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = (match[2] || '').trim()
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
        process.env[key] = process.env[key] || value
      }
    }
  }
} catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const TELEGRAM_BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '8638107104:AAHd2IYOmLRB1kOl3Rcr0TFnNvlIo0-UjDk'
const TELEGRAM_CHAT_ID = process.env.VITE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '497789001'
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || process.env.VITE_LLM_API_KEY || process.env.LLM_API_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[HermesCron] Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não fornecidos.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const mode = process.argv[2] === 'night' ? 'night' : 'morning'

async function fetchDashboardData() {
  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const tomorrowIso = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

  const [
    { data: events },
    { data: pantry },
    { data: spending },
    { data: assets }
  ] = await Promise.all([
    supabase.from('events').select('*').gte('date', todayIso).lte('date', tomorrowIso),
    supabase.from('pantry').select('*'),
    supabase.from('spending').select('*'),
    supabase.from('assets').select('*')
  ])

  return {
    todayEvents: (events || []).filter(e => e.date === todayIso),
    tomorrowEvents: (events || []).filter(e => e.date === tomorrowIso),
    lowPantry: (pantry || []).filter(p => Number(p.qty || 0) <= Number(p.lowThreshold || 1)),
    spending: spending || [],
    assets: assets || []
  }
}

async function generateAIBriefing(data) {
  const now = new Date()
  const dateFormatted = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  if (mode === 'night') {
    const prompt = `Você é o HERMES, copiloto executivo do Life OS Hub.
Escreva um fechamento noturno carinhoso, inteligente e relaxante (3 frases) para o usuário descansar a mente.
- Compromissos de Hoje: ${data.todayEvents.length} atividades
- Amanhã: ${data.tomorrowEvents.length > 0 ? data.tomorrowEvents.map(e => e.title).join(', ') : 'Agenda livre'}
- Itens na Despensa a Comprar: ${data.lowPantry.length} itens

Gere o Debriefing Noturno:`

    if (GROQ_API_KEY) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.6,
            max_tokens: 250
          })
        })
        if (res.ok) {
          const json = await res.json()
          const text = json.choices?.[0]?.message?.content?.trim()
          if (text) {
            return [
              `🌙 *DEBRIEFING NOTURNO — LIFE OS HUB*`,
              `📅 *Data:* ${dateFormatted}`,
              ``,
              `🤖 *Mensagem do Hermes:*`,
              `"${text.replace(/^["']|["']$/g, '')}"`,
              ``,
              `🚀 _Enviado autonomamente via Hermes 24/7 Cloud_`
            ].join('\n')
          }
        }
      } catch (err) {
        console.warn('[HermesCron] Groq fallback:', err)
      }
    }

    return [
      `🌙 *DEBRIEFING NOTURNO — LIFE OS HUB*`,
      `📅 *Data:* ${dateFormatted}`,
      ``,
      `Boa noite! Mais um dia de conquistas concluído com sucesso. ${data.tomorrowEvents.length > 0 ? `Para amanhã, você tem ${data.tomorrowEvents.length} compromisso(s) previsto(s).` : 'Sua agenda de amanhã está livre para focar em novos projetos.'} Lembre-se de registrar qualquer despesa pendente antes de dormir. Tenha uma excelente noite de descanso! ✨`,
      ``,
      `🚀 _Enviado autonomamente via Hermes 24/7 Cloud_`
    ].join('\n')
  }

  // Morning Mode
  const prompt = `Você é o HERMES, copiloto executivo do Life OS Hub.
Escreva um briefing matinal estimulante, elegante e direto ao ponto (3 a 4 frases) para o usuário começar o dia com clareza.
- Compromissos de Hoje (${data.todayEvents.length}): ${data.todayEvents.map(e => `${e.title}${e.timeStart ? ` às ${e.timeStart}` : ''}`).join(', ') || 'Nenhum'}
- Compromissos de Amanhã (${data.tomorrowEvents.length}): ${data.tomorrowEvents.map(e => e.title).join(', ') || 'Agenda livre'}
- Despensa em baixa (${data.lowPantry.length}): ${data.lowPantry.slice(0, 3).map(p => p.name).join(', ') || 'Tudo abastecido'}

Gere o Briefing Matinal:`

  let aiText = ''
  if (GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 300
        })
      })
      if (res.ok) {
        const json = await res.json()
        aiText = json.choices?.[0]?.message?.content?.trim() || ''
      }
    } catch (err) {
      console.warn('[HermesCron] Groq fallback:', err)
    }
  }

  if (!aiText) {
    aiText = `Bom dia! Para hoje, você tem ${data.todayEvents.length > 0 ? `${data.todayEvents.length} compromisso(s) agendado(s)` : 'a agenda livre'}. ${data.lowPantry.length > 0 ? `Na despensa, ${data.lowPantry.length} item(ns) precisam de reposição.` : 'Sua despensa está em ordem.'} Tenha um dia produtivo e de grandes realizações!`
  }

  return [
    `☀️ *BOM DIA! RESUMO MATINAL — LIFE OS HUB*`,
    `📅 *Data:* ${dateFormatted}`,
    ``,
    `🤖 *Mensagem do Hermes:*`,
    `"${aiText.replace(/^["']|["']$/g, '')}"`,
    ``,
    `📌 *Compromissos de Hoje (${data.todayEvents.length}):*`,
    data.todayEvents.length > 0
      ? data.todayEvents.map(e => `• ${e.timeStart ? `${e.timeStart} - ` : ''}${e.title}`).join('\n')
      : `• Nenhum compromisso para hoje.`,
    ``,
    `📅 *Compromissos de Amanhã (${data.tomorrowEvents.length}):*`,
    data.tomorrowEvents.length > 0
      ? data.tomorrowEvents.map(e => `• ${e.timeStart ? `${e.timeStart} - ` : ''}${e.title}`).join('\n')
      : `• Agenda de amanhã livre.`,
    ``,
    `🛒 *Despensa & Compras (${data.lowPantry.length} pendentes):*`,
    data.lowPantry.length > 0
      ? data.lowPantry.map(i => `• ${i.name} (Comprar: ${i.lowThreshold || 1} ${i.unit || 'un'})`).join('\n')
      : `• Tudo abastecido em casa!`,
    ``,
    `🚀 _Enviado autonomamente via Hermes 24/7 Cloud_`
  ].join('\n')
}

async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'Markdown'
    })
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Falha Telegram (${res.status}): ${errText}`)
  }

  const json = await res.json()
  return json
}

async function main() {
  console.log(`[HermesCron] Iniciando disparo no modo: ${mode.toUpperCase()}...`)
  const data = await fetchDashboardData()
  const message = await generateAIBriefing(data)
  const result = await sendTelegramMessage(message)
  console.log(`[HermesCron] Sucesso! Mensagem enviada ao Telegram (ID: ${result.result?.message_id}).`)
}

main().catch(err => {
  console.error('[HermesCron] Erro na execução:', err)
  process.exit(1)
})
