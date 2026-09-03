import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

function llmDevProxyPlugin(): Plugin {
  return {
    name: 'llm-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/llm/proxy') && req.method === 'POST') {
          let bodyStr = ''
          req.on('data', (chunk) => {
            bodyStr += chunk
          })
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}')
              const { action, provider = 'nvidia', apiKey, model, messages, customUrl } = body
              const token = (apiKey || '').trim()

              let baseUrl = 'https://integrate.api.nvidia.com/v1'
              if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1'
              else if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1'
              else if (provider === 'custom' && customUrl) baseUrl = customUrl.replace(/\/+$/, '')

              const headers: Record<string, string> = { 'Content-Type': 'application/json' }
              if (token) headers['Authorization'] = `Bearer ${token}`
              if (provider === 'openrouter') {
                headers['HTTP-Referer'] = 'https://appcontroletotal.local'
                headers['X-Title'] = 'Life OS Hub'
              }

              if (action === 'models') {
                const response = await fetch(`${baseUrl}/models`, { method: 'GET', headers })
                const data = await response.json()
                res.writeHead(response.status, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ ok: response.ok, data }))
              }

              if (action === 'chat') {
                let targetModel = model
                if (provider === 'nvidia') {
                  if (!targetModel || targetModel.startsWith('openai/') || targetModel.includes('gpt-oss') || targetModel.includes('versatile') || !targetModel.includes('/')) {
                    targetModel = 'meta/llama-3.3-70b-instruct'
                  }
                } else if (provider === 'groq') {
                  if (!targetModel || targetModel.startsWith('meta/') || targetModel.includes('versatile')) {
                    targetModel = 'openai/gpt-oss-120b'
                  }
                }

                const response = await fetch(`${baseUrl}/chat/completions`, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    model: targetModel || (provider === 'nvidia' ? 'meta/llama-3.3-70b-instruct' : 'openai/gpt-oss-120b'),
                    messages: messages || [],
                    temperature: body.temperature ?? 0.7,
                    max_tokens: body.max_tokens ?? 800,
                    ...(body.response_format ? { response_format: body.response_format } : {}),
                  }),
                })
                const data: any = await response.json().catch(() => ({}))
                res.writeHead(response.status, { 'Content-Type': 'application/json' })
                if (!response.ok) {
                  const errMsg = data?.error?.message || data?.detail || data?.title || data?.message || 'Falha na resposta do modelo'
                  return res.end(JSON.stringify({ ok: false, error: `HTTP ${response.status}: ${errMsg}`, data }))
                }
                return res.end(JSON.stringify({ ok: true, data }))
              }

              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'Ação inválida' }))
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: err?.message || 'Erro interno no proxy dev' }))
            }
          })
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    llmDevProxyPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Life OS Hub',
        short_name: 'Life OS Hub',
        description: 'Sistema Operacional Pessoal PWA — Dashboard, Life-Log, Manutenção, Despensa, Viagens e Agenda com IA.',
        start_url: '/',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#6366f1',
        orientation: 'portrait-primary',
        scope: '/',
        lang: 'pt-BR',
        categories: ['productivity', 'utilities', 'lifestyle'],
        icons: [
          {
            src: '/icons/icon-72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        // Web Share Target — permite receber links compartilhados (YouTube, Instagram, etc.)
        share_target: {
          action: '/share-target',
          method: 'GET',
          enctype: 'application/x-www-form-urlencoded',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
      workbox: {
        // Cache strategies
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        // Navigate fallback for SPA
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Runtime caching
        runtimeCaching: [
          // Google Fonts — stale while revalidate (fast + fresh)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Mock API (localStorage-backed) — network first, fallback to cache
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'act-api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        // Skip waiting for new SW to take control immediately
        skipWaiting: true,
        clientsClaim: true,
        // Cleanup outdated caches
        cleanupOutdatedCaches: true,
      },
      // Dev options
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Let Rollup safely handle chunk splitting without circular runtime dependency glitches
    chunkSizeWarningLimit: 1000,
  },
})