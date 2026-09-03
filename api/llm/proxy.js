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
        let cleanErr = errorText;
        try {
          const parsed = JSON.parse(errorText);
          cleanErr = parsed?.error?.message || parsed?.detail || parsed?.title || parsed?.message || errorText;
        } catch {}
        return res.status(response.status).json({
          ok: false,
          error: `HTTP ${response.status}: ${cleanErr.slice(0, 300) || 'Falha ao buscar modelos'}`,
        });
      }

      const data = await response.json();
      return res.status(200).json({ ok: true, data });
    }

    // 2. ACTION: CHAT COMPLETIONS
    if (action === 'chat') {
      const chatUrl = `${baseUrl}/chat/completions`;

      let targetModel = model;
      if (provider === 'nvidia') {
        if (!targetModel || targetModel.startsWith('openai/') || targetModel.includes('gpt-oss') || targetModel.includes('versatile')) {
          targetModel = 'meta/llama-3.3-70b-instruct';
        }
      } else if (provider === 'groq') {
        if (!targetModel || targetModel.startsWith('meta/') || targetModel.startsWith('google/') || targetModel.includes('vision')) {
          targetModel = 'openai/gpt-oss-120b';
        }
      } else if (provider === 'openrouter') {
        if (!targetModel) {
          targetModel = 'google/gemini-2.0-flash-exp:free';
        } else if (targetModel === 'meta/llama-3.2-11b-vision-instruct') {
          targetModel = 'meta-llama/llama-3.2-11b-vision-instruct:free';
        } else if (targetModel === 'meta/llama-3.3-70b-instruct') {
          targetModel = 'meta-llama/llama-3.3-70b-instruct';
        }
      }

      const reqPayload = {
        model: targetModel,
        messages: messages || [],
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 800,
      };

      if (body.response_format) {
        reqPayload.response_format = body.response_format;
      }

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(reqPayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let cleanErr = errorText;
        try {
          const parsed = JSON.parse(errorText);
          cleanErr = parsed?.error?.message || parsed?.detail || parsed?.title || parsed?.message || errorText;
        } catch {}
        return res.status(response.status).json({
          ok: false,
          error: `HTTP ${response.status}: ${cleanErr.slice(0, 300) || 'Falha na resposta do modelo'}`,
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
