import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '@/lib/db'
import { toast } from '@/stores/toastStore'
import { Share2, Sparkles, Loader2 } from 'lucide-react'

export function ShareTargetHandler() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'done'>('processing')

  useEffect(() => {
    let active = true

    async function handleShare() {
      const url = searchParams.get('url') || ''
      const title = searchParams.get('title') || ''
      const text = searchParams.get('text') || ''

      const combinedText = [text, title].filter(Boolean).join(' - ')
      const isYoutube = url.includes('youtube.com') || url.includes('youtu.be')
      const isInstagram = url.includes('instagram.com')

      try {
        if (url) {
          const kind = isInstagram ? 'instagram' : 'youtube'
          const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `media-${Date.now()}`

          await db.insert('media', {
            id,
            kind,
            url,
            title: title || (isYoutube ? 'Vídeo do YouTube' : isInstagram ? 'Post do Instagram' : 'Link Compartilhado'),
            sourceLabel: isYoutube ? 'YouTube' : isInstagram ? 'Instagram' : 'Web',
            thumbnail: null,
            summary: text || 'Compartilhado via Web Share Target do celular',
            minutes: 0,
            status: 'salvo',
            tags: ['mobile', 'share'],
            createdAt: new Date().toISOString(),
          })

          toast.success('Mídia salva com sucesso no Life-Log!')
        } else if (combinedText) {
          const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `fact-${Date.now()}`

          await db.insert('facts', {
            id,
            content: combinedText,
            source: 'Compartilhado pelo celular',
            tags: ['mobile', 'compartilhado'],
            createdAt: new Date().toISOString(),
          })

          toast.success('Anotação salva no Cofre de Fatos!')
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
