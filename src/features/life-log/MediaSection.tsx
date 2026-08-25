import { Camera, Check, Clock, ExternalLink, Globe, Music2, RotateCcw, Share2, SquarePlay, Trash2 } from 'lucide-react'
import type { MediaItem, MediaStatus } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/feedback'
import { cn, shortDateTime } from '@/lib/utils'
import { usePendingDelete } from '@/lib/usePendingDelete'

function getPlatformInfo(sourceLabel: string, url: string, kind: string) {
  const s = (sourceLabel || '').toLowerCase()
  const u = (url || '').toLowerCase()

  if (s.includes('facebook') || u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.me')) {
    return {
      name: 'Facebook',
      badgeClass: 'border-blue-500/30 bg-blue-500/15 text-blue-300',
      gradient: 'from-blue-950/50 via-zinc-900 to-zinc-950',
      icon: Share2,
    }
  }
  if (s.includes('instagram') || u.includes('instagram.com') || u.includes('instagr.am')) {
    return {
      name: 'Instagram',
      badgeClass: 'border-purple-500/30 bg-purple-500/15 text-purple-300',
      gradient: 'from-purple-950/50 via-zinc-900 to-zinc-950',
      icon: Camera,
    }
  }
  if (s.includes('tiktok') || u.includes('tiktok.com')) {
    return {
      name: 'TikTok',
      badgeClass: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300',
      gradient: 'from-cyan-950/50 via-zinc-900 to-zinc-950',
      icon: Music2,
    }
  }
  if (s.includes('youtube') || u.includes('youtube.com') || u.includes('youtu.be') || kind === 'youtube') {
    return {
      name: 'YouTube',
      badgeClass: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
      gradient: 'from-rose-950/50 via-zinc-900 to-zinc-950',
      icon: SquarePlay,
    }
  }
  return {
    name: sourceLabel || 'Web',
    badgeClass: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300',
    gradient: 'from-indigo-950/50 via-zinc-900 to-zinc-950',
    icon: Globe,
  }
}

/** Saved YouTube/Instagram/Facebook links (PRD "Artigos & Mídias"): cards with mock AI summary. */
export function MediaSection({
  media,
  onToggle,
  onRemove,
  className,
}: {
  media: MediaItem[]
  onToggle: (id: string, status: MediaStatus) => Promise<void> | void
  onRemove: (id: string) => Promise<void> | void
  className?: string
}) {
  const { pendingDelete, request } = usePendingDelete()

  const sorted = [...media].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'salvo' ? -1 : 1
    return b.createdAt.localeCompare(a.createdAt)
  })
  const salvo = media.filter((m) => m.status === 'salvo').length

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title="Artigos & Mídias"
        subtitle={`${media.length} links · ${salvo} para ver depois`}
        action={<span className="chip px-2 py-0.5 text-[10px]">YouTube · Instagram · Facebook · Web</span>}
      />

      {media.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<ExternalLink className="h-5 w-5" />}
            title="Nenhum link salvo"
            description="Vídeos, posts do Instagram/Facebook e artigos compartilhados aparecem aqui."
          />
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((m) => {
            const platform = getPlatformInfo(m.sourceLabel, m.url, m.kind)
            const PlatformIcon = platform.icon

            return (
              <div key={m.id} className="card card-hover group flex flex-col overflow-hidden">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block aspect-video overflow-hidden"
                  aria-label={`Abrir ${m.title}`}
                >
                  {m.thumbnail ? (
                    <img src={m.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span
                      className={cn(
                        'flex h-full w-full items-center justify-center bg-gradient-to-br',
                        platform.gradient,
                      )}
                    >
                      <PlatformIcon className="h-8 w-8 text-zinc-500 transition-transform group-hover:scale-110" />
                    </span>
                  )}
                  <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                  {m.status === 'salvo' && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-emerald-300 backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ver depois
                    </span>
                  )}
                </a>

                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('chip px-2 py-0.5 text-[10px]', platform.badgeClass)}>
                      {platform.name}
                    </span>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
                      aria-label="Abrir link externo"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100 transition-colors hover:text-zinc-50"
                  >
                    {m.title}
                  </a>
                  <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">{m.summary}</p>
                  <p className="truncate text-[11px] text-zinc-600">
                    {m.sourceLabel} · <span className="font-num">{shortDateTime(m.createdAt)}</span>
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <span className="font-num inline-flex items-center gap-1 text-[11px] text-zinc-500">
                      <Clock className="h-3.5 w-3.5" /> {m.minutes} min
                    </span>
                    <div className="flex items-center gap-1">
                      {m.status === 'salvo' ? (
                        <Button
                          variant="soft"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => onToggle(m.id, 'consumido')}
                        >
                          <Check className="h-3.5 w-3.5" /> Consumido
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => onToggle(m.id, 'salvo')}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Ver depois
                        </Button>
                      )}
                      {pendingDelete === m.id ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => request(m.id, () => void onRemove(m.id))}
                        >
                          Remover?
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir link"
                          onClick={() => request(m.id, () => void onRemove(m.id))}
                          className="h-7 w-7 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}