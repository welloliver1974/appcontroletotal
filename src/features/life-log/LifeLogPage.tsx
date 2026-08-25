import { useState } from 'react'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/feedback'
import { api } from '@/data/api'
import type { Fact, LifeLogEntry, MediaItem, MediaStatus, ReadingEntry } from '@/data/types'
import { useLifeLogData } from './useLifeLogData'
import { Kpis } from './Kpis'
import { HermesAsk } from './HermesAsk'
import { MediaSection } from './MediaSection'
import { LogsSection } from './LogsSection'
import { ReadingSection } from './ReadingSection'
import { FactVault, type FactDraft } from './FactVault'
import { DocVaultSection } from './DocVaultSection'
import { LogEntryForm, type LogDraft } from './LogEntryForm'
import { ReadingForm, type ReadingDraft } from './ReadingForm'
import { VoiceNoteRecorderModal } from './VoiceNoteRecorderModal'

type LogFormState = null | { mode: 'new' } | { mode: 'edit'; entry: LifeLogEntry }
type ReadingFormState = null | { mode: 'new' } | { mode: 'edit'; entry: ReadingEntry }

function LifeLogSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-3 w-24 rounded-full" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <Skeleton className="h-44 rounded-xl" />
    </div>
  )
}

/** Fase 2 — Life-Log: diário (CRUD + busca + Hermes Ask), leitura e artigos & mídias. */
export function LifeLogPage() {
  const module = MODULE_BY_ID['life-log']
  const { data, setLogs, setReading, setMedia, setFacts } = useLifeLogData()
  const [openLog, setOpenLog] = useState<LogFormState>(null)
  const [openReading, setOpenReading] = useState<ReadingFormState>(null)
  const [openVoiceNote, setOpenVoiceNote] = useState(false)

  const saveLog = async (draft: LogDraft) => {
    if (!data) return
    if (openLog?.mode === 'edit') {
      const rows = await api.update<LifeLogEntry>('lifeLog', openLog.entry.id, draft)
      setLogs(rows)
    } else {
      const created = await api.create<LifeLogEntry>('lifeLog', {
        ...draft,
        createdAt: new Date().toISOString(),
      })
      setLogs([created, ...data.logs])
    }
    setOpenLog(null)
  }

  const deleteLog = async (id: string) => {
    setLogs(await api.remove<LifeLogEntry>('lifeLog', id))
  }

  const saveReading = async (draft: ReadingDraft) => {
    if (!data) return
    if (openReading?.mode === 'edit') {
      const rows = await api.update<ReadingEntry>('reading', openReading.entry.id, {
        ...draft,
        updatedAt: new Date().toISOString(),
      })
      setReading(rows)
    } else {
      const created = await api.create<ReadingEntry>('reading', {
        ...draft,
        updatedAt: new Date().toISOString(),
      })
      setReading([created, ...data.reading])
    }
    setOpenReading(null)
  }

  const deleteReading = async (id: string) => {
    setReading(await api.remove<ReadingEntry>('reading', id))
  }

  const toggleMedia = async (id: string, status: MediaStatus) => {
    setMedia(await api.update<MediaItem>('media', id, { status }))
  }

  const deleteMedia = async (id: string) => {
    setMedia(await api.remove<MediaItem>('media', id))
  }

  const saveFact = async (draft: FactDraft) => {
    if (!data) return
    const created = await api.create<Fact>('facts', {
      ...draft,
      createdAt: new Date().toISOString(),
    })
    setFacts([created, ...data.facts])
  }

  const deleteFact = async (id: string) => {
    setFacts(await api.remove<Fact>('facts', id))
  }

  const convertFactToMedia = async (fact: Fact) => {
    if (!data) return
    const match = fact.content.match(/https?:\/\/[^\s"'<>()[\]]+/i)
    const domainMatch = fact.content.match(
      /(?:www\.)?(?:youtube\.com|youtu\.be|instagram\.com|facebook\.com|fb\.watch|fb\.me|tiktok\.com|threads\.net|x\.com|twitter\.com)\/[^\s"'<>()[\]]+/i,
    )
    const detectedUrl = match
      ? match[0].replace(/[)\].,;!?"']+$/, '')
      : domainMatch
        ? `https://${domainMatch[0].replace(/[)\].,;!?"']+$/, '')}`
        : ''

    if (!detectedUrl) return

    const isYoutube = detectedUrl.includes('youtube.com') || detectedUrl.includes('youtu.be')
    const isInstagram = detectedUrl.includes('instagram.com') || detectedUrl.includes('instagr.am')
    const isFacebook =
      detectedUrl.includes('facebook.com') ||
      detectedUrl.includes('fb.watch') ||
      detectedUrl.includes('fb.me')
    const isTiktok = detectedUrl.includes('tiktok.com')

    let kind: 'youtube' | 'instagram' = isYoutube ? 'youtube' : 'instagram'
    let sourceLabel = 'Web'
    let thumbnail: string | undefined = undefined

    if (isYoutube) {
      kind = 'youtube'
      sourceLabel = 'YouTube'
      const ytMatch = detectedUrl.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i,
      )
      if (ytMatch) {
        thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
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
            : 'Link Salvo'

    const cleanTitle = fact.content.replace(detectedUrl, '').trim() || defaultTitle

    const tagPrefix = isYoutube
      ? 'youtube'
      : isInstagram
        ? 'instagram'
        : isFacebook
          ? 'facebook'
          : isTiktok
            ? 'tiktok'
            : 'web'

    const newMedia = await api.create<MediaItem>('media', {
      kind,
      url: detectedUrl,
      title: cleanTitle,
      sourceLabel,
      thumbnail,
      summary: cleanTitle,
      minutes: isYoutube ? 5 : 0,
      status: 'salvo',
      tags: [tagPrefix, 'migrado'],
      createdAt: fact.createdAt || new Date().toISOString(),
    })

    const updatedFacts = await api.remove<Fact>('facts', fact.id)
    setFacts(updatedFacts)
    setMedia([newMedia, ...data.media])
  }

  return (
    <div className="space-y-6">
      <PageHeader module={module} />

      {!data ? (
        <LifeLogSkeleton />
      ) : (
        <>
          <Kpis logs={data.logs} reading={data.reading} />
          <HermesAsk entries={data.logs} />
          <MediaSection media={data.media} onToggle={toggleMedia} onRemove={deleteMedia} />
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <LogsSection
              logs={data.logs}
              className="lg:col-span-2"
              onNew={() => setOpenLog({ mode: 'new' })}
              onVoiceNote={() => setOpenVoiceNote(true)}
              onEdit={(entry) => setOpenLog({ mode: 'edit', entry })}
              onRemove={deleteLog}
            />
            <ReadingSection
              reading={data.reading}
              onNew={() => setOpenReading({ mode: 'new' })}
              onEdit={(entry) => setOpenReading({ mode: 'edit', entry })}
              onRemove={deleteReading}
            />
          </div>
          <FactVault
            facts={data.facts}
            onAdd={saveFact}
            onRemove={deleteFact}
            onConvertToMedia={convertFactToMedia}
          />
          <DocVaultSection />
        </>
      )}

      {openLog && (
        <LogEntryForm
          key={openLog.mode === 'edit' ? openLog.entry.id : 'new'}
          mode={openLog.mode}
          entry={openLog.mode === 'edit' ? openLog.entry : undefined}
          onClose={() => setOpenLog(null)}
          onSubmit={saveLog}
        />
      )}
      {openVoiceNote && (
        <VoiceNoteRecorderModal
          open={openVoiceNote}
          onClose={() => setOpenVoiceNote(false)}
          onSubmit={saveLog}
        />
      )}
      {openReading && (
        <ReadingForm
          key={openReading.mode === 'edit' ? openReading.entry.id : 'new'}
          mode={openReading.mode}
          entry={openReading.mode === 'edit' ? openReading.entry : undefined}
          onClose={() => setOpenReading(null)}
          onSubmit={saveReading}
        />
      )}
    </div>
  )
}