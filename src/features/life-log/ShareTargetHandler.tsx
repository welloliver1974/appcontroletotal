import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '@/lib/db'
import { toast } from '@/stores/toastStore'
import { Share2, Sparkles, Loader2 } from 'lucide-react'

function extractUrl(text: string): string | null {
  if (!text) return null
  const match = text.match(/https?:\/\/[^\s"'<>()[\]]+/i)
  if (match) {
    return match[0].replace(/[)\].,;!?"']+$/, '')
  }
  const domainMatch = text.match(
    /(?:www\.)?(?:youtube\.com|youtu\.be|instagram\.com|facebook\.com|fb\.watch|fb\.me|tiktok\.com|threads\.net|x\.com|twitter\.com)\/[^\s"'<>()[\]]+/i,
  )
  if (domainMatch) {
    return `https://${domainMatch[0].replace(/[)\].,;!?"']+$/, '')}`
  }
  return null
}

function extractYoutubeVideoId(urlStr: string): string | null {
  if (!urlStr) return null
  const match = urlStr.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i,
  )
  return match ? match[1] : null
}

export function ShareTargetHandler() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'done'>('processing')

  useEffect(() => {
    let active = true

    async function handleShare() {
      const rawUrl = searchParams.get('url') || searchParams.get('link') || ''
      const rawTitle = searchParams.get('title') || searchParams.get('name') || ''
      const rawText = searchParams.get('text') || searchParams.get('description') || ''

      // Extrai URL de qualquer um dos campos (YouTube, Instagram, Facebook, TikTok, etc.)
      const detectedUrl =
        extractUrl(rawUrl) || extractUrl(rawText) || extractUrl(rawTitle)

      const isYoutube =
        !!detectedUrl && (detectedUrl.includes('youtube.com') || detectedUrl.includes('youtu.be'))
      const isInstagram =
        !!detectedUrl && (detectedUrl.includes('instagram.com') || detectedUrl.includes('instagr.am'))
      const isFacebook =
        !!detectedUrl &&
        (detectedUrl.includes('facebook.com') ||
          detectedUrl.includes('fb.watch') ||
          detectedUrl.includes('fb.me'))
      const isTiktok = !!detectedUrl && detectedUrl.includes('tiktok.com')
      const isTwitter =
        !!detectedUrl && (detectedUrl.includes('twitter.com') || detectedUrl.includes('x.com'))
      const isThreads = !!detectedUrl && detectedUrl.includes('threads.net')

      try {
        if (detectedUrl) {
          // Limpa URL do título e texto para obter nomes limpos
          const cleanText = rawText.replace(detectedUrl, '').trim()
          const cleanTitle = rawTitle.replace(detectedUrl, '').trim()

          // No banco Supabase kind aceita ('youtube', 'instagram')
          let kind: 'youtube' | 'instagram' = isYoutube ? 'youtube' : 'instagram'
          let sourceLabel = 'Web'
          let thumbnail: string | undefined = undefined

          if (isYoutube) {
            kind = 'youtube'
            sourceLabel = 'YouTube'
            const ytId = extractYoutubeVideoId(detectedUrl)
            if (ytId) {
              thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
            }
          } else if (isInstagram) {
            kind = 'instagram'
            sourceLabel = 'Instagram'
          } else if (isFacebook) {
            kind = 'instagram'
            sourceLabel = 'Facebook'
          } else if (isTiktok) {
            kind = 'instagram'
            sourceLabel = 'TikTok'
          } else if (isThreads) {
            kind = 'instagram'
            sourceLabel = 'Threads'
          } else if (isTwitter) {
            kind = 'instagram'
            sourceLabel = 'X / Twitter'
          } else {
            try {
              const parsed = new URL(detectedUrl)
              sourceLabel = parsed.hostname.replace(/^www\./, '')
            } catch {
              sourceLabel = 'Web'
            }
          }

          const defaultTitle = isYoutube
            ? 'Vídeo do YouTube'
            : isInstagram
              ? 'Post do Instagram'
              : isFacebook
                ? 'Post do Facebook'
                : isTiktok
                  ? 'Vídeo do TikTok'
                  : isThreads
                    ? 'Post do Threads'
                    : isTwitter
                      ? 'Post do X / Twitter'
                      : 'Link Compartilhado'

          const finalTitle =
            cleanTitle ||
            cleanText.replace(/^assista a\s*['"]?/i, '').replace(/['"]?\s*(no youtube|no facebook|no instagram).*$/i, '') ||
            defaultTitle

          const finalSummary =
            cleanText && cleanText !== cleanTitle
              ? cleanText
              : `Compartilhado via ${sourceLabel} no celular`

          const id =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `media-${Date.now()}`

          const tagPrefix = isYoutube
            ? 'youtube'
            : isInstagram
              ? 'instagram'
              : isFacebook
                ? 'facebook'
                : isTiktok
                  ? 'tiktok'
                  : 'web'

          await db.insert('media', {
            id,
            kind,
            url: detectedUrl,
            title: finalTitle,
            sourceLabel,
            thumbnail,
            summary: finalSummary,
            minutes: isYoutube ? 5 : 0,
            status: 'salvo',
            tags: [tagPrefix, 'mobile', 'share'],
            createdAt: new Date().toISOString(),
          })

          toast.success(`Salvo em Artigos & Mídias (${sourceLabel})! 🎬`)
        } else {
          const combinedText = [rawText, rawTitle].filter(Boolean).join(' - ').trim()

          if (combinedText) {
            const id =
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `fact-${Date.now()}`

            await db.insert('facts', {
              id,
              content: combinedText,
              source: 'Compartilhado pelo celular',
              tags: ['mobile', 'compartilhado'],
              createdAt: new Date().toISOString(),
            })

            toast.success('Anotação salva no Cofre de Fatos!')
          }
        }

        if (active) {
          setStatus('done')
          navigate('/life-log', { replace: true })
        }
      } catch (err) {
        console.error('[ShareTarget] Error saving shared item:', err)
        toast.error('Não foi possível salvar o item compartilhado.')
        if (active) {
          navigate('/life-log', { replace: true })
        }
      }
    }

    handleShare()

    return () => {
      active = false
    }
  }, [searchParams, navigate])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 animate-pulse">
        <Share2 className="h-8 w-8" />
      </div>
      <h2 className="font-display text-xl font-semibold text-zinc-100 flex items-center justify-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-400" />
        Processando compartilhamento...
      </h2>
      <p className="mt-2 text-sm text-zinc-400 max-w-sm">
        Salvando link/conteúdo diretamente no seu Life-Log. Você será redirecionado em instantes.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
        <span>{status === 'processing' ? 'Sincronizando com o banco...' : 'Concluído!'}</span>
      </div>
    </div>
  )
}
