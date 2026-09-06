// Vercel Serverless Function — Webhook de captura do Hermes Agent (Telegram / VPS / Mobile)
// Rota: POST /api/webhook/hermes-capture
import { createClient } from '@supabase/supabase-js';

// Timestamps explícitos no formato ISO
const nowIso = () => new Date().toISOString();
const todayDateIso = () => new Date().toISOString().slice(0, 10);
const genId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

// Tokens e Chat IDs padrão
const SILVIA_CHAT_ID = '8927954331';
const SILVIA_BOT_TOKEN = '8959661332:AAHwFSeidRmv9dvjnzujFeERKbmV_HQjzwc';
const WELL_CHAT_ID = '497789001';
const WELL_BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN || '8638107104:AAHd2IYOmLRB1kOl3Rcr0TFnNvlIo0-UjDk';

async function sendTelegramReply(chatId, text, customToken) {
  if (!chatId || !text) return;
  const token = customToken || (String(chatId) === SILVIA_CHAT_ID ? SILVIA_BOT_TOKEN : WELL_BOT_TOKEN);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.warn('[TelegramReply warning]:', data);
    }
  } catch (err) {
    console.warn('[TelegramReply Error]:', err);
  }
}

async function askHermesAI(userMessage, isSilvia, supabase) {
  const userName = isSilvia ? 'Silvia' : 'Wellington';
  const botName = isSilvia ? 'Herculana' : 'Hermes';

  let groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
  let targetModel = 'openai/gpt-oss-120b';

  if (supabase) {
    try {
      const { data } = await supabase.from('app_settings').select('data').eq('id', 'hermes_config').maybeSingle();
      if (data?.data) {
        groqKey = data.data.groqApiKey || data.data.llmApiKey || groqKey;
        if (data.data.llmModel && data.data.provider === 'groq') {
          targetModel = data.data.llmModel;
        }
      }
    } catch {}
  }

  if (!groqKey) {
    return isSilvia
      ? `Olá Silvia! ✨ Estou aqui com você. Como posso te ajudar hoje no Life OS Hub?`
      : `Fala Wellington! Estou online e pronto para agir em qualquer módulo do Life OS Hub.`;
  }

  const candidateModels = [targetModel, 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'].filter((v, i, a) => a.indexOf(v) === i);

  for (const model of candidateModels) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `Você é ${botName}, assistente e copiloto pessoal de alta performance de ${userName} no aplicativo Life OS Hub.
Você tem acesso e atua em TODO o ecossistema do aplicativo da família:
- Finanças & Gastos compartilhados
- Despensa & Lista de Compras do Mercado
- FitWell (Treinos, Medidas corporais, Peso e Bioimpedância)
- Agenda & Compromissos da família
- Diário Pessoal (Life-Log) e Galeria de Mídias/Vídeos

Suas diretrizes de comunicação:
1. Seja 100% natural, amigável, humana, empática e inteligente. NUNCA seja fria, robótica ou engessada.
2. Se o usuário mandar saudações (ex: "boa noite", "bom dia", "como vai?", "oi", "tudo bem?"), responda calorosamente com simpatia em 2 a 3 frases.
3. Se o usuário fizer perguntas gerais ou pedir conselhos, responda de forma prestativa, clara e elegante.
4. Lembre suavemente, quando for oportuno, que você pode registrar treinos, pesos, medidas, compras ou finanças a qualquer momento.
5. Use emojis moderados e de bom gosto.`
            },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      const json = await res.json();
      if (json.choices?.[0]?.message?.content) {
        let text = json.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        if (text) return text;
      }
    } catch (err) {
      console.warn(`[HermesAI model ${model} error]:`, err);
    }
  }

  return isSilvia
    ? `Olá Silvia! ✨ Estou aqui com você. Como posso te ajudar agora no seu dia ou no Life OS Hub?`
    : `Fala Wellington! Estou online e pronto para agir em qualquer módulo do Life OS Hub.`;
}

async function transcribeTelegramAudio(fileId, botToken, groqKey) {
  if (!fileId || !botToken || !groqKey) return '';
  try {
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) {
      console.warn('[Telegram getFile error]:', fileData);
      return '';
    }

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    const audioRes = await fetch(downloadUrl);
    const arrayBuffer = await audioRes.arrayBuffer();
    const audioBlob = new Blob([arrayBuffer], { type: 'audio/ogg' });

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'pt');

    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
      },
      body: formData,
    });

    const whisperData = await whisperRes.json();
    if (whisperData.text) {
      return whisperData.text.trim();
    }
    console.warn('[Groq Whisper response empty]:', whisperData);
  } catch (err) {
    console.error('[transcribeTelegramAudio error]:', err);
  }
  return '';
}

function inferPantryCategory(itemName) {
  const t = (itemName || '').toLowerCase();
  if (/(coca|coke|refrigerante|suco|cerveja|vinho|leite|caf[eé]|ch[aá]|água|bebida|energetico|pepsi|guaran[aá])/i.test(t)) return 'bebidas';
  if (/(sab[aã]o|detergente|amaciante|papel higi[eê]nico|desinfetante|limpeza|esponja|veja|cloro|yp[eê])/i.test(t)) return 'limpeza';
  if (/(shampoo|sabonete|pasta de dente|creme|desodorante|higiene|fio dental|escova|cotonete)/i.test(t)) return 'higiene';
  if (/(carne|frango|peixe|ovos|queijo|presunto|iogurte|manteiga|requeij[aã]o|fruta|maç[aã]|banana|tomate|legume|batata)/i.test(t)) return 'frescos';
  return 'alimentos';
}

function splitGroceryItems(text) {
  const cleaned = text.replace(/^(comprar|compra|adicionar [aà] despensa|adicionar|falta|preciso de|mercado:|despensa:|pegar)\s*/i, '').trim();
  const parts = cleaned
    .split(/[\n,;]|\s+e\s+/i)
    .map((s) => s.trim().replace(/^-\s*/, ''))
    .filter((s) => s.length > 1);
  return parts.length > 0 ? parts : [cleaned];
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

  const body = req.body || {};
  const tgMsg = body.message || body.edited_message || body.channel_post || {};
  const chatId = tgMsg.chat?.id || body.chat_id || body.chatId;
  const isTelegramUpdate = !!(body.update_id || body.message || body.edited_message);

  // 1. Validação de Segurança para chamadas externas que NÃO são webhook do Telegram
  const expectedSecret = process.env.HERMES_API_KEY || process.env.VITE_HERMES_API_KEY || '';
  if (!isTelegramUpdate && expectedSecret && expectedSecret.trim() !== '' && expectedSecret !== 'sua_chave_de_seguranca_aqui') {
    const authHeader = req.headers.authorization || '';
    const sigHeader = req.headers['x-hermes-signature'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim() || sigHeader.trim();

    if (!token || token !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized: Chave secreta inválida' });
    }
  }

  const isSilviaUser = String(chatId) === SILVIA_CHAT_ID;
  const userEmail = isSilviaUser ? 'silvinhamsa@gmail.com' : 'welloliver@gmail.com';
  const botToken = isSilviaUser ? SILVIA_BOT_TOKEN : WELL_BOT_TOKEN;

  // 2. Conexão com o Supabase Principal do Life OS
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

  const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  // Conexão com o Supabase do FitWell
  const FITWELL_URL =
    process.env.VITE_FITWELL_SUPABASE_URL || 'https://haavrgglnfbchiygspqw.supabase.co';
  const FITWELL_KEY =
    process.env.VITE_FITWELL_SUPABASE_KEY || 'sb_publishable_Ad2aSiOJKf_53pnMCLhc6A_JkX1vvJ2';
  const fitSupabase = FITWELL_URL && FITWELL_KEY ? createClient(FITWELL_URL, FITWELL_KEY) : null;

  // Obtenção da Chave Groq
  let groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
  if (supabase) {
    try {
      const { data } = await supabase.from('app_settings').select('data').eq('id', 'hermes_config').maybeSingle();
      if (data?.data?.groqApiKey) groqKey = data.data.groqApiKey;
      else if (data?.data?.llmApiKey) groqKey = data.data.llmApiKey;
    } catch {}
  }

  // 3. Suporte a Mensagens de Áudio / Voz do Telegram (Whisper IA)
  const voiceFileId = tgMsg.voice?.file_id || tgMsg.audio?.file_id;
  let voiceTranscription = '';
  let isVoice = false;

  if (voiceFileId) {
    isVoice = true;
    voiceTranscription = await transcribeTelegramAudio(voiceFileId, botToken, groqKey);
  }

  const tgText = typeof tgMsg.text === 'string' ? tgMsg.text : (typeof tgMsg.caption === 'string' ? tgMsg.caption : '');

  const rawText = String(
    voiceTranscription ||
    body.text ||
    tgText ||
    body.content ||
    body.summary ||
    body.title ||
    body.name ||
    body.body ||
    body.input ||
    body.prompt ||
    body.query ||
    body.description ||
    (typeof body === 'string' ? body : '')
  ).trim();

  const lowerText = rawText.toLowerCase().replace(/[!?.,]/g, '').trim();

  // Normalização do payload
  const action = body.action || body.event || body.type || '';
  let platform = String(body.platform || body.kind || '').toLowerCase();
  const title = typeof body.title === 'string' && body.title ? body.title.slice(0, 250) : rawText.slice(0, 250);
  const summary = typeof body.summary === 'string' && body.summary ? body.summary.slice(0, 4000) : rawText.slice(0, 4000);
  const url = typeof body.url === 'string' && body.url ? body.url : (rawText.match(/https?:\/\/[^\s]+/)?.[0] || null);
  const userTag = isSilviaUser ? 'user:silvia' : 'user:wellington';
  const tags = Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean).slice(0, 10) : ['hermes', 'telegram', userTag];

  // -------------------------------------------------------------
  // SMART DETECTION: FIT (PESO, MEDIDAS, TREINOS)
  // -------------------------------------------------------------
  const weightMatch = rawText.match(/(?:pesei|peso|pesando|balan[cç]a|estou com|meu peso|peso atual|marcar peso|anotar peso)\s*(?:hoje|de|[eé]|foi|deu|em|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:kg|quilos|kilos)?/i)
    || rawText.match(/(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|quilos|kilos)/i)
    || rawText.match(/^(\d{2,3}(?:[.,]\d+)?)$/);

  const measureMatch = rawText.match(/(?:medida|medir|circunfer[eê]ncia)?\s*(?:de|do|da)?\s*(cintura|quadril|bra[cç]o|coxa|panturrilha|peito|peitoral|ombro|pesco[cç]o|abd[oô]men|busto)\s*(?:hoje|de|em|[eé]|foi|deu|t[aá]|est[aá]|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:cm|cent[ií]metros)?/i);

  const workoutMatch = rawText.match(/(?:treino|treinei|fiz\s+treino|conclu[ií]\s+treino|acabei\s+de\s+treinar|hoje\s+treinei)\s*(?:de|do|da)?\s*(.+)/i);

  // Detecção de compras
  const isGroceryPattern =
    /(coca|coke|batata|leite|doce|arroz|feij[aã]o|caf[eé]|p[aã]o|aç[uú]car|[oó]leo|manteiga|queijo|cerveja|sab[aã]o|shampoo|detergente|frango|carne|banana|maç[aã]|tomate|cebola|alho|[aá]gua|suco|macarr[aã]o|sal|farinha|iogurte|presunto|papel higi[eê]nico|desodorante|pasta de dente)/i.test(lowerText) ||
    tags.some((t) => /pantry|compra|mercado|despensa/i.test(t));

  const isCommand = weightMatch || measureMatch || workoutMatch
    || /^(comprar|compra|mercado|despensa|preciso de|falta|comprar:|comprar\s+|pegar\s+)/i.test(lowerText)
    || (isGroceryPattern && rawText.split(/\s+/).length <= 8)
    || /^(gastei|paguei|despesa|gasto)/i.test(lowerText) || /r\$\s*\d+/i.test(lowerText)
    || /^(reuni[aã]o|compromisso|consulta|dentista|m[eé]dico|call|agendar)/i.test(lowerText)
    || /^(di[aá]rio|hoje eu|me sinto|gratid[aã]o|pensamento)/i.test(lowerText)
    || !!url;

  // -------------------------------------------------------------
  // CONVERSA NATURAL VIA IA (GROQ / LLM) SE NÃO FOR COMANDO ESPECÍFICO
  // -------------------------------------------------------------
  if (!isCommand && !action && !platform) {
    const aiReply = await askHermesAI(rawText, isSilviaUser, supabase);
    const finalReply = isVoice ? `🎤 "${rawText}"\n\n${aiReply}` : aiReply;
    await sendTelegramReply(chatId, finalReply);
    return res.status(200).json({ ok: true, message: 'AI replied', text: finalReply });
  }

  if (!platform && !action) {
    if (weightMatch) {
      platform = 'fit_weight';
    } else if (measureMatch) {
      platform = 'fit_measurement';
    } else if (workoutMatch) {
      platform = 'fit_workout';
    } else if (
      /^(comprar|compra|mercado|despensa|preciso de|falta|comprar:|comprar\s+|pegar\s+)/i.test(lowerText) ||
      (isGroceryPattern && rawText.split(/\s+/).length <= 8)
    ) {
      platform = 'pantry';
    } else if (/^(gastei|paguei|despesa|gasto)/i.test(lowerText) || /r\$\s*\d+/i.test(lowerText)) {
      platform = 'spending';
    } else if (/^(reuni[aã]o|compromisso|consulta|dentista|m[eé]dico|call|agendar)/i.test(lowerText)) {
      platform = 'event';
    } else if (url && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('instagram.com') || url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.me') || url.includes('tiktok.com'))) {
      platform = 'media';
    } else if (/^(di[aá]rio|hoje eu|me sinto|gratid[aã]o|pensamento)/i.test(lowerText)) {
      platform = 'life_log';
    }
  }

  const voicePrefix = isVoice && rawText ? `🎤 "${rawText}"\n\n` : '';

  try {
    // -------------------------------------------------------------
    // 1. FIT: REGISTRO DE PESO
    // -------------------------------------------------------------
    if (platform === 'fit_weight' && weightMatch) {
      const weightVal = Number(weightMatch[1].replace(',', '.'));
      const logDate = todayDateIso();

      if (fitSupabase) {
        await fitSupabase.from('body_weights').insert({
          weight_kg: weightVal,
          log_date: logDate,
          created_at: nowIso(),
        });
      }

      const responseMessage = `${voicePrefix}⚖️ Peso de ${weightVal} kg registrado com sucesso no seu perfil Fit! 💪`;
      await sendTelegramReply(chatId, responseMessage);

      return res.status(200).json({
        ok: true,
        success: true,
        type: 'fit_weight',
        weight: weightVal,
        message: responseMessage,
      });
    }

    // -------------------------------------------------------------
    // 2. FIT: REGISTRO DE MEDIDAS CORPORAIS
    // -------------------------------------------------------------
    if (platform === 'fit_measurement' && measureMatch) {
      const rawLabel = measureMatch[1];
      const valCm = Number(measureMatch[2].replace(',', '.'));
      const formattedLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1).toLowerCase();
      const logDate = todayDateIso();

      if (fitSupabase) {
        await fitSupabase.from('body_measurements').insert({
          label: formattedLabel,
          value_cm: valCm,
          log_date: logDate,
          created_at: nowIso(),
        });
      }

      const responseMessage = `${voicePrefix}📏 Medida de ${formattedLabel} (${valCm} cm) salva no seu histórico do Fit! ✨`;
      await sendTelegramReply(chatId, responseMessage);

      return res.status(200).json({
        ok: true,
        success: true,
        type: 'fit_measurement',
        label: formattedLabel,
        valueCm: valCm,
        message: responseMessage,
      });
    }

    // -------------------------------------------------------------
    // 3. FIT: REGISTRO DE TREINOS
    // -------------------------------------------------------------
    if (platform === 'fit_workout' && workoutMatch) {
      const workoutName = workoutMatch[1].trim();
      const formattedName = workoutName.charAt(0).toUpperCase() + workoutName.slice(1);

      if (fitSupabase) {
        await fitSupabase.from('workout_sessions').insert({
          name: formattedName,
          completed_at: nowIso(),
          created_at: nowIso(),
        });
      }

      const responseMessage = `${voicePrefix}🔥 Treino "${formattedName}" concluído e registrado no seu Fit! Parabéns! 🏋️‍♀️`;
      await sendTelegramReply(chatId, responseMessage);

      return res.status(200).json({
        ok: true,
        success: true,
        type: 'fit_workout',
        name: formattedName,
        message: responseMessage,
      });
    }

    // -------------------------------------------------------------
    // A. DESPENSA / LISTA DE COMPRAS (pantry)
    // -------------------------------------------------------------
    const isBoughtAction =
      action === 'pantry_restock' ||
      /^(comprei|comprado|compramos|repus|repor|abasteci)\s+/i.test(lowerText);

    if (
      isBoughtAction ||
      action === 'pantry_add' ||
      action === 'pantry_shopping_list' ||
      platform === 'pantry' ||
      platform === 'despensa' ||
      platform === 'compras'
    ) {
      let cleanGroceryText = rawText;
      if (isBoughtAction) {
        cleanGroceryText = cleanGroceryText.replace(/^(comprei|comprado|compramos|repus|repor|abasteci)\s+/i, '');
      } else {
        cleanGroceryText = cleanGroceryText.replace(/^(comprar|compra|preciso de|falta|pegar)\s+/i, '');
      }

      const rawItemList = (Array.isArray(body.payload?.items) || Array.isArray(body.items))
        ? (Array.isArray(body.payload?.items) ? body.payload.items : body.items)
        : splitGroceryItems(cleanGroceryText || body.name || title).map((name) => ({ name }));

      const inserted = [];

      if (supabase) {
        for (const it of rawItemList) {
          const itName = it.name ? it.name.trim() : 'Item sem nome';
          const formattedName = itName.charAt(0).toUpperCase() + itName.slice(1);
          const itCategory = it.category || inferPantryCategory(formattedName);
          const targetQty = isBoughtAction ? (Number(it.qty) > 0 ? Number(it.qty) : 2) : 0;

          const { data: existing } = await supabase
            .from('pantry')
            .select('*')
            .ilike('name', formattedName)
            .limit(1);

          if (existing && existing.length > 0) {
            await supabase
              .from('pantry')
              .update({ qty: targetQty, updated_at: nowIso() })
              .eq('id', existing[0].id);
            inserted.push(formattedName);
          } else {
            const itemRow = {
              id: it.id || genId(),
              name: formattedName,
              category: itCategory,
              qty: targetQty,
              unit: it.unit || 'un',
              low_threshold: 1,
              expires_at: it.expiresAt || it.expires_at || null,
              created_at: nowIso(),
              updated_at: nowIso(),
            };
            const { error } = await supabase.from('pantry').insert(itemRow);
            if (!error) inserted.push(formattedName);
          }
        }
      } else {
        inserted.push(...rawItemList.map((it) => it.name));
      }

      const responseMessage = isBoughtAction
        ? `✅ ${inserted.join(', ')} marcado(s) como comprado(s) e despensa atualizada! 🛒`
        : `🛒 ${inserted.join(', ')} adicionado(s) à lista de compras da despensa!`;

      await sendTelegramReply(chatId, responseMessage);

      return res.status(200).json({
        ok: true,
        success: true,
        table: 'pantry',
        isRestocked: isBoughtAction,
        itemsCount: inserted.length,
        items: inserted,
        message: responseMessage,
      });
    }

    // -------------------------------------------------------------
    // B. MÍDIAS & LINKS (YouTube / Instagram / Web)
    // -------------------------------------------------------------
    const isUrl = url && /^(http|https):\/\/[^ "]+$/.test(url);
    const isMediaPlatform = ['youtube', 'instagram', 'web', 'tiktok', 'artigo', 'video', 'media'].includes(platform);
    const hasMediaUrl = isUrl && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('instagram.com') || url.includes('tiktok.com'));

    if (isMediaPlatform || hasMediaUrl) {
      let kind = 'youtube';
      if (platform === 'instagram' || (url && url.includes('instagram.com'))) {
        kind = 'instagram';
      }

      let thumbnail = body.thumbnail || null;
      if (!thumbnail && kind === 'youtube' && url) {
        const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
        if (ytMatch) {
          thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        }
      }

      const mediaRow = {
        id: body.id || genId(),
        kind,
        url: url || '',
        title: title || (kind === 'youtube' ? 'Vídeo do YouTube' : 'Post do Instagram'),
        source_label: body.sourceLabel || (kind === 'youtube' ? 'YouTube · Hermes' : 'Instagram · Hermes'),
        thumbnail,
        summary: summary || title || 'Capturado via Hermes Telegram',
        minutes: Number(body.minutes || 0),
        status: 'salvo',
        tags,
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      if (supabase) {
        await supabase.from('media').insert(mediaRow);
      }

      const replyText = `🎬 Link "${mediaRow.title}" salvo na sua galeria de mídias!`;
      await sendTelegramReply(chatId, replyText);

      return res.status(200).json({
        ok: true,
        success: true,
        table: 'media',
        kind,
        message: replyText,
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

      if (supabase) {
        await supabase.from('spending').insert(spendingRow);
      }

      const replyText = `💸 Gasto registrado com sucesso nas Finanças da família!`;
      await sendTelegramReply(chatId, replyText);

      return res.status(200).json({
        ok: true,
        success: true,
        table: 'spending',
        message: replyText,
      });
    }

    // -------------------------------------------------------------
    // D. AGENDA / COMPROMISSOS (events)
    // -------------------------------------------------------------
    if (action === 'event_add' || platform === 'event' || platform === 'agenda') {
      const eventRow = {
        id: body.id || genId(),
        title: title || 'Compromisso',
        date: body.date || nowIso().slice(0, 10),
        time_start: body.timeStart || body.time_start || '09:00',
        time_end: body.timeEnd || body.time_end || null,
        category: ['reuniao', 'pessoal', 'habit', 'viagem'].includes(body.category) ? body.category : 'pessoal',
        location: body.location || null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      if (supabase) {
        await supabase.from('events').insert(eventRow);
      }

      const replyText = `📅 Compromisso "${eventRow.title}" agendado com sucesso!`;
      await sendTelegramReply(chatId, replyText);

      return res.status(200).json({
        ok: true,
        success: true,
        table: 'events',
        message: replyText,
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

      if (supabase) {
        await supabase.from('life_log').insert(logRow);
      }

      const replyText = `📝 Entrada salva no seu Diário Pessoal: "${logRow.title}"!`;
      await sendTelegramReply(chatId, replyText);

      return res.status(200).json({
        ok: true,
        success: true,
        table: 'life_log',
        message: replyText,
      });
    }

    // -------------------------------------------------------------
    // F. DEFAULT: COFRE DE FATOS / NOTAS RÁPIDAS (facts)
    // -------------------------------------------------------------
    const factRow = {
      id: body.id || genId(),
      content: rawText || (typeof body === 'string' ? body : JSON.stringify(body)),
      source: 'telegram',
      tags,
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    if (supabase) {
      await supabase.from('facts').insert(factRow);
    }

    const replyText = `💡 Anotado! Salvei sua nota no Life OS Hub:\n\n"${factRow.content}"`;
    await sendTelegramReply(chatId, replyText);

    return res.status(200).json({
      ok: true,
      success: true,
      table: 'facts',
      message: replyText,
    });
  } catch (err) {
    console.error('[HermesCaptureWebhook Error]:', err);
    if (chatId) {
      await sendTelegramReply(chatId, `⚠️ Recebi sua mensagem, mas tive uma instabilidade ao salvar: ${err.message || 'Erro'}`);
    }
    return res.status(200).json({
      ok: false,
      error: err.message || 'Erro ao processar dados',
    });
  }
}