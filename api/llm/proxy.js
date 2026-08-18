// api/llm/proxy.js
// Serverless API Proxy for LLM providers (NVIDIA, Groq, OpenRouter, Custom) to avoid browser CORS issues.

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-provider,x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action, provider = 'nvidia', apiKey, model, messages, customUrl } = body;

    const token = (apiKey || req.headers['x-api-key'] || '').trim();

    // Map provider endpoints
    let baseUrl = 'https://integrate.api.nvidia.com/v1';
    if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
    else if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1';
    else if (provider === 'custom' && customUrl) baseUrl = customUrl.replace(/\/+$/, '');

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://appcontroletotal.local';
      headers['X-Title'] = 'Life OS Hub';
    }

    // 1. ACTION: FETCH MODELS
    if (action === 'models') {
      const modelsUrl = `${baseUrl}/models`;
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return res.status(response.status).json({
          ok: false,
          error: `HTTP ${response.status}: ${errorText.slice(0, 300) || 'Falha ao buscar modelos'}`,
        });
      }

      const data = await response.json();
      return res.status(200).json({ ok: true, data });
    }

    // 2. ACTION: CHAT COMPLETIONS
    if (action === 'chat') {
      const chatUrl = `${baseUrl}/chat/completions`;
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || (provider === 'nvidia' ? 'meta/llama-3.3-70b-instruct' : 'llama-3.3-70b-versatile'),
          messages: messages || [],
          temperature: body.temperature ?? 0.7,
          max_tokens: body.max_tokens ?? 800,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return res.status(response.status).json({
          ok: false,
          error: `HTTP ${response.status}: ${errorText.slice(0, 300) || 'Falha na resposta do modelo'}`,
        });
      }

      const data = await response.json();
      return res.status(200).json({ ok: true, data });
    }

    return res.status(400).json({ ok: false, error: `Ação inválida: "${action}". Use "models" ou "chat".` });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erro interno no proxy LLM',
    });
  }
}
