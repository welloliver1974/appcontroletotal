// Vercel Serverless Function — Proxy e Sincronizador de iCal do Google Calendar com suporte a RRULE
// Rota: POST /api/calendar/sync-ical
import { createClient } from '@supabase/supabase-js';

const nowIso = () => new Date().toISOString();

function inferCategory(title, location) {
  const text = `${title || ''} ${location || ''}`.toLowerCase();
  if (/(meet|reuni[aã]o|call|sync|alinhamento|1:1|1on1|entrevista|apresenta[cç][aã]o|zoom|teams|google meet)/.test(text)) {
    return 'reuniao';
  }
  if (/(voo|hotel|viagem|aeroporto|embarque|airbnb|trip|flight|check-in)/.test(text)) {
    return 'viagem';
  }
  if (/(treino|academia|h[aá]bito|estudo|rem[eé]dio|medita[cç][aã]o|corrida|foco|leitura)/.test(text)) {
    return 'habit';
  }
  return 'pessoal';
}

function parseIcalDateTime(rawStr) {
  if (!rawStr) return null;
  const val = rawStr.includes(':') ? rawStr.split(':').pop() || rawStr : rawStr;
  const clean = val.trim();

  if (/^\d{8}$/.test(clean)) {
    const y = Number(clean.slice(0, 4));
    const m = Number(clean.slice(4, 6));
    const d = Number(clean.slice(6, 8));
    return {
      date: `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`,
      time: '08:00',
      fullDate: new Date(y, m - 1, d, 8, 0),
    };
  }

  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (match) {
    const [, y, m, d, hh, mm] = match;
    if (clean.endsWith('Z')) {
      const utcDate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm)));
      const brFormatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = brFormatter.formatToParts(utcDate);
      const getP = (type) => parts.find((p) => p.type === type)?.value || '00';
      return {
        date: `${getP('year')}-${getP('month')}-${getP('day')}`,
        time: `${getP('hour')}:${getP('minute')}`,
        fullDate: utcDate,
      };
    }
    return {
      date: `${y}-${m}-${d}`,
      time: `${hh}:${mm}`,
      fullDate: new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm)),
    };
  }
  return null;
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function unfoldIcal(raw) {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const unfolded = [];
  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (unfolded.length > 0) unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }
  return unfolded;
}

function parseIcalText(icalText) {
  const lines = unfoldIcal(icalText);
  const rawEvents = [];
  let inEvent = false;
  let current = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
      continue;
    }
    if (trimmed === 'END:VEVENT') {
      inEvent = false;
      if (current.STATUS === 'CANCELLED') continue;
      if (!current.SUMMARY && !current.DESCRIPTION) continue;

      const start = parseIcalDateTime(current.DTSTART || '');
      if (!start) continue;
      const end = current.DTEND ? parseIcalDateTime(current.DTEND) : null;
      const uid = current.UID || `gcal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const title = (current.SUMMARY || current.DESCRIPTION || 'Compromisso').replace(/\\([,;\\])/g, '$1');
      const location = current.LOCATION ? current.LOCATION.replace(/\\([,;\\])/g, '$1') : null;
      const rrule = current.RRULE;

      rawEvents.push({ uid, title, location, start, end, rrule });
      continue;
    }
    if (inEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const fullKey = line.slice(0, colonIdx);
        const val = line.slice(colonIdx + 1);
        const keyName = fullKey.split(';')[0].trim().toUpperCase();
        current[keyName] = val;
      }
    }
  }

  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 6, 0);

  const events = [];
  const seenIds = new Set();

  for (const item of rawEvents) {
    const category = inferCategory(item.title, item.location);
    const baseId = item.uid.startsWith('gcal-') ? item.uid : `gcal-${item.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)}`;

    if (!item.rrule) {
      if (!seenIds.has(baseId)) {
        seenIds.add(baseId);
        events.push({
          id: baseId,
          title: item.title,
          date: item.start.date,
          time_start: item.start.time,
          time_end: item.end ? item.end.time : null,
          category,
          location: item.location,
          created_at: nowIso(),
          updated_at: nowIso(),
        });
      }
      continue;
    }

    const rruleUpper = item.rrule.toUpperCase();
    const isDaily = rruleUpper.includes('FREQ=DAILY');
    const isWeekly = rruleUpper.includes('FREQ=WEEKLY');
    const isMonthly = rruleUpper.includes('FREQ=MONTHLY');
    const isYearly = rruleUpper.includes('FREQ=YEARLY');

    let untilDate = null;
    const untilMatch = rruleUpper.match(/UNTIL=([0-9T]+Z?)/);
    if (untilMatch) {
      const parsedUntil = parseIcalDateTime(untilMatch[1]);
      if (parsedUntil) untilDate = parsedUntil.fullDate;
    }

    const curr = new Date(item.start.fullDate);
    let count = 0;
    const maxCount = 200;

    while (curr <= windowEnd && count < maxCount) {
      if (untilDate && curr > untilDate) break;

      if (curr >= windowStart) {
        const occDateStr = toIsoDate(curr);
        const occId = `${baseId}-${occDateStr}`;
        if (!seenIds.has(occId)) {
          seenIds.add(occId);
          events.push({
            id: occId,
            title: item.title,
            date: occDateStr,
            time_start: item.start.time,
            time_end: item.end ? item.end.time : null,
            category,
            location: item.location,
            created_at: nowIso(),
            updated_at: nowIso(),
          });
        }
      }

      if (isDaily) curr.setDate(curr.getDate() + 1);
      else if (isWeekly) curr.setDate(curr.getDate() + 7);
      else if (isMonthly) curr.setMonth(curr.getMonth() + 1);
      else if (isYearly) curr.setFullYear(curr.getFullYear() + 1);
      else break;
      count++;
    }
  }

  return events;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { icalUrl } = req.body || {};
  if (!icalUrl || typeof icalUrl !== 'string' || !icalUrl.startsWith('http')) {
    return res.status(400).json({ error: 'URL do iCal (.ics) inválida ou não informada.' });
  }

  try {
    const fetchRes = await fetch(icalUrl, {
      headers: {
        'User-Agent': 'LifeOS-Calendar-Sync/1.0',
      },
    });

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({
        error: `Não foi possível baixar o calendário do Google (HTTP ${fetchRes.status}). Verifique se o link secreto está correto.`,
      });
    }

    const icalText = await fetchRes.text();
    const parsedEvents = parseIcalText(icalText);

    const SUPABASE_URL =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://fxjdaqpfjdntbyjettun.supabase.co';

    const SUPABASE_KEY =
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      'sb_publishable_Vo2Dk5JtUa4wI_dYxaXRFA_j6aA2seP';

    let savedCount = 0;
    if (SUPABASE_URL && SUPABASE_KEY && parsedEvents.length > 0) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { error } = await supabase.from('events').upsert(parsedEvents, { onConflict: 'id' });
      if (error) {
        console.warn('[SyncIcal] Supabase upsert error:', error.message);
      } else {
        savedCount = parsedEvents.length;
      }
    }

    return res.status(200).json({
      success: true,
      eventsCount: parsedEvents.length,
      savedCount,
      events: parsedEvents.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        timeStart: e.time_start,
        timeEnd: e.time_end,
        category: e.category,
        location: e.location,
      })),
      syncedAt: nowIso(),
    });
  } catch (err) {
    console.error('[SyncIcal Error]:', err);
    return res.status(500).json({
      error: err.message || 'Erro ao sincronizar calendário.',
    });
  }
}
