// Vercel Serverless Function — Webhook de captura do Hermes Agent (Telegram / VPS / Mobile)
// Rota: POST /api/webhook/hermes-capture
import { createClient } from '@supabase/supabase-js';

// Timestamps explícitos no formato ISO
const nowIso = () => new Date().toISOString();
const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

function inferPantryCategory(itemName) {
  const t = (itemName || '').toLowerCase();
  if (/(coca|refrigerante|suco|cerveja|vinho|leite|caf[eé]|ch[aá]|água|bebida|energetico)/.test(t)) return 'bebidas';
  if (/(sab[aã]o|detergente|amaciante|papel higi[eê]nico|desinfetante|limpeza|esponja|veja)/.test(t)) return 'limpeza';
  if (/(shampoo|sabonete|pasta de dente|creme|desodorante|higiene|fio dental|escova)/.test(t)) return 'higiene';
  if (/(carne|frango|peixe|ovos|queijo|presunto|iogurte|manteiga|requeij[aã]o)/.test(t)) return 'frescos';
  return 'alimentos';
}

export default async function handler(req, res) {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Hermes-Signature'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'Hermes Capture Webhook - Life OS Hub',
      time: nowIso(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Validação de Segurança (Bearer Token ou X-Hermes-Signature)
  const expectedSecret = process.env.HERMES_API_KEY || process.env.VITE_HERMES_API_KEY || '';
  if (expectedSecret && expectedSecret.trim() !== '' && expectedSecret !== 'sua_chave_de_seguranca_aqui') {
    const authHeader = req.headers.authorization || '';
    const sigHeader = req.headers['x-hermes-signature'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim() || sigHeader.trim();

    if (!token || token !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized: Chave secreta inválida' });
    }
  }

  // 2. Resolução resiliente das credenciais do Supabase
  const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://fxjdaqpfjdntbyjettun.supabase.co';

  const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    'sb_publishable_Vo2Dk5JtUa4wI_dYxaXRFA_j6aA2seP';

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase não configurado no servidor' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const body = req.body || {};

  // Normalização do payload
  const action = body.action || body.event || body.type || '';
  let platform = String(body.platform || body.kind || '').toLowerCase();
  const title = typeof body.title === 'string' ? body.title.slice(0, 250) : '';
  const summary = typeof body.summary === 'string' ? body.summary.slice(0, 4000) : (typeof body.body === 'string' ? body.body : '');
  const rawText = (title || summary || (typeof body === 'string' ? body : '')).trim();
  const lowerText = rawText.toLowerCase();
  const url = typeof body.url === 'string' && body.url ? body.url : null;
  const tags = Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean).slice(0, 10) : ['hermes', 'telegram'];

  // Smart Intent Detection para mensagens livres do Telegram
  if (!platform && !action) {
    if (/^(comprar|compra|mercado|despensa|preciso de|falta|comprar:)/i.test(lowerText) || /(lista de compras)/i.test(lowerText)) {
      platform = 'pantry';
    } else if (/^(gastei|paguei|despesa|gasto)/i.test(lowerText) || /r\$\s*\d+/i.test(lowerText)) {
      platform = 'spending';
    } else if (/^(reuni[aã]o|compromisso|consulta|dentista|m[eé]dico|call|agendar)/i.test(lowerText)) {
      platform = 'event';
    } else if (/^(di[aá]rio|hoje eu|me sinto|gratid[aã]o|pensamento)/i.test(lowerText)) {
      platform = 'life_log';
    }
  }

  let name = typeof body.name === 'string' ? body.name.slice(0, 250) : (title || 'Item sem nome');
  if (platform === 'pantry' && !body.name && rawText) {
    name = rawText.replace(/^(comprar|compra|adicionar [aà] despensa|adicionar|falta|preciso de|mercado:|despensa:)\s*/i, '').trim();
    if (name) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    } else {
      name = rawText;
    }
  }

  try {
    // -------------------------------------------------------------
    // A. DESPENSA / LISTA DE COMPRAS (pantry)
    // -------------------------------------------------------------
    if (
      action === 'pantry_add' ||
      action === 'pantry_shopping_list' ||
      platform === 'pantry' ||
      platform === 'despensa' ||
      platform === 'compras'
    ) {
      // Se for uma lista múltipla de itens (ex: exportação de compras)
      if (Array.isArray(body.payload?.items) || Array.isArray(body.items)) {
        const rawItems = Array.isArray(body.payload?.items) ? body.payload.items : body.items;
        const inserted = [];

        for (const it of rawItems) {
          const itName = it.name || 'Item sem nome';
          const itemRow = {
            id: it.id || genId(),
            name: itName,
            category: it.category || inferPantryCategory(itName),
            qty: Number(it.qty ?? it.quantity ?? 1),
            unit: it.unit || 'un',
            low_threshold: Number(it.lowThreshold ?? it.low_threshold ?? 1),
            expires_at: it.expiresAt || it.expires_at || null,
            created_at: nowIso(),
            updated_at: nowIso(),
          };
          const { error } = await supabase.from('pantry').upsert(itemRow);
          if (!error) inserted.push(itemRow.name);
        }

        return res.status(201).json({
          success: true,
          table: 'pantry',
          itemsCount: inserted.length,
          items: inserted,
          message: `${inserted.length} itens processados na despensa`,
        });
      }

      // Item individual
      const itemRow = {
        id: body.id || genId(),
        name: name || 'Item',
        category: body.category || inferPantryCategory(name),
        qty: Number(body.qty ?? body.quantity ?? 1),
        unit: body.unit || 'un',
        low_threshold: Number(body.lowThreshold ?? body.low_threshold ?? 1),
        expires_at: body.expiresAt || body.expires_at || null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      const { data, error } = await supabase.from('pantry').insert(itemRow).select().single();
      if (error) throw error;

      return res.status(201).json({
        success: true,
        table: 'pantry',
        id: data.id,
        item: itemRow,
        message: `Item "${itemRow.name}" adicionado à despensa`,
      });
    }

    // -------------------------------------------------------------
    // B. MÍDIAS & LINKS (YouTube / Instagram / Web)
    // -------------------------------------------------------------
    const isUrl = url && /^(http|https):\/\/[^ "]+$/.test(url);
    const isMediaPlatform = ['youtube', 'instagram', 'web', 'tiktok', 'artigo', 'video'].includes(platform);
    const hasMediaUrl = isUrl && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('instagram.com'));

    if (isMediaPlatform || hasMediaUrl) {
      let kind = 'youtube';
      if (platform === 'instagram' || (url && url.includes('instagram.com'))) {
        kind = 'instagram';
      }

      const mediaRow = {
        id: body.id || genId(),
        kind,
        url: url || '',
        title: title || (kind === 'youtube' ? 'Vídeo do YouTube' : 'Post do Instagram'),
        source_label: body.sourceLabel || (kind === 'youtube' ? 'YouTube · Hermes' : 'Instagram · Hermes'),
        thumbnail: body.thumbnail || null,
        summary: summary || title || 'Capturado via Hermes Telegram',
        minutes: Number(body.minutes || 0),
        status: 'salvo',
        tags,
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      const { data, error } = await supabase.from('media').insert(mediaRow).select().single();
      if (error) throw error;

      return res.status(201).json({
        success: true,
        table: 'media',
        id: data.id,
        kind,
        message: `Mídia "${mediaRow.title}" salva no Life-Log`,
      });
    }

    // -------------------------------------------------------------
    // C. GASTOS / DESPESAS (spending)
    // -------------------------------------------------------------
    if (action === 'spending_add' || platform === 'spending' || platform === 'gasto' || body.amount) {
      const spendingRow = {
        id: body.id || genId(),
        week: body.date || body.week || nowIso().slice(0, 10),
        despensa: Number(body.despensa || (body.category === 'Alimentação' ? body.amount : 0)),
        manutencao: Number(body.manutencao || (body.category === 'Manutenção' ? body.amount : 0)),
        viagens: Number(body.viagens || (body.category === 'Viagens' ? body.amount : 0)),
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      const { data, error } = await supabase.from('spending').insert(spendingRow).select().single();
      if (error) throw error;

      return res.status(201).json({
        success: true,
        table: 'spending',
        id: data.id,
        message: 'Gasto registrado com sucesso',
      });
    }

    // -------------------------------------------------------------
    // D. AGENDA / COMPROMISSOS (events)
    // -------------------------------------------------------------
    if (action === 'event_add' || platform === 'event' || platform === 'agenda') {
      const eventRow = {
        id: body.id || genId(),
        title: title || name || 'Compromisso',
        date: body.date || nowIso().slice(0, 10),
        time_start: body.timeStart || body.time_start || '09:00',
        time_end: body.timeEnd || body.time_end || null,
        category: ['reuniao', 'pessoal', 'habit', 'viagem'].includes(body.category) ? body.category : 'pessoal',
        location: body.location || null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      const { data, error } = await supabase.from('events').insert(eventRow).select().single();
      if (error) throw error;

      return res.status(201).json({
        success: true,
        table: 'events',
        id: data.id,
        message: `Compromisso "${eventRow.title}" agendado`,
      });
    }

    // -------------------------------------------------------------
    // E. DIÁRIO (life_log)
    // -------------------------------------------------------------
    if (action === 'lifelog_add' || platform === 'life_log' || platform === 'diario') {
      const logRow = {
        id: body.id || genId(),
        title: title || 'Reflexão rápida',
        body: summary || body.body || title,
        tags,
        mood: Math.min(5, Math.max(1, Number(body.mood) || 3)),
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      const { data, error } = await supabase.from('life_log').insert(logRow).select().single();
      if (error) throw error;

      return res.status(201).json({
        success: true,
        table: 'life_log',
        id: data.id,
        message: `Entrada criada no Diário: "${logRow.title}"`,
      });
    }

    // -------------------------------------------------------------
    // F. DEFAULT: COFRE DE FATOS / NOTAS RÁPIDAS (facts)
    // -------------------------------------------------------------
    const factRow = {
      id: body.id || genId(),
      content: summary || title || (typeof body === 'string' ? body : JSON.stringify(body)),
      source: body.source || 'telegram',
      tags,
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    const { data, error } = await supabase.from('facts').insert(factRow).select().single();
    if (error) throw error;

    return res.status(201).json({
      success: true,
      table: 'facts',
      id: data.id,
      message: 'Nota salva no Cofre de Fatos',
    });
  } catch (err) {
    console.error('[HermesCaptureWebhook Error]:', err);
    return res.status(500).json({
      error: err.message || 'Erro ao processar dados no banco Supabase',
      details: String(err),
    });
  }
}