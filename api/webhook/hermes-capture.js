// Vercel Serverless Function — webhook de captura do Hermes Agent
// Rota: POST /api/webhook/hermes-capture
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers.authorization || '';
  const expected = `Bearer ${process.env.HERMES_API_KEY}`;
  if (!auth || auth !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured on server' });
  }

  const body = req.body || {};
  const platform = ['youtube', 'instagram', 'web', 'note'].includes(body.platform) ? body.platform : 'note';
  const title = typeof body.title === 'string' ? body.title.slice(0, 200) : 'Sem título';
  const summary = typeof body.summary === 'string' ? body.summary.slice(0, 2000) : '';
  const url = typeof body.url === 'string' && body.url ? body.url : null;
  const tags = Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean).slice(0, 10) : [];

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  if (platform === 'youtube' || platform === 'instagram' || platform === 'web') {
    const { data, error } = await supabase
      .from('media')
      .insert({
        kind: platform,
        url: url || '',
        title,
        source_label: platform,
        thumbnail: null,
        summary,
        minutes: 0,
        status: 'salvo',
        tags,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ success: true, id: data.id, table: 'media' });
  }

  // nota pura -> tabela facts
  const { data, error } = await supabase
    .from('facts')
    .insert({ content: summary || title, source: 'hermes', tags })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ success: true, id: data.id, table: 'facts' });
}