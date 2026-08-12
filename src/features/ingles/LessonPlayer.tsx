import { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, BookOpen, Volume2 } from 'lucide-react'
import type { Lesson, Course } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface LessonPlayerProps {
  course: Course
  lesson: Lesson
  onNavigate: (direction: 'prev' | 'next') => void
  onComplete: () => void
  hasPrev: boolean
  hasNext: boolean
  progress: number
}

/** Render Markdown content safely (simple implementation for mock) */
function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-like rendering for demo
  const lines = content.split('\n')
  return (
    <div className="prose prose-invert max-w-none text-zinc-300">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-2xl font-bold text-zinc-100 mt-6 mb-3">{line.slice(2)}</h1>
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-semibold text-zinc-100 mt-5 mb-2">{line.slice(3)}</h2>
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-medium text-zinc-200 mt-4 mb-2">{line.slice(4)}</h3>
        }
        if (line.startsWith('> **')) {
          return (
            <blockquote key={i} className="border-l-4 border-blue-500/50 pl-4 my-3 text-blue-200 italic">
              {line.slice(2)}
            </blockquote>
          )
        }
        if (line.startsWith('|') && line.includes('|')) {
          // Table row - skip for now, complex to render
          return null
        }
        if (line.trim() === '---') {
          return <hr key={i} className="my-4 border-zinc-800" />
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i} className="ml-4 mb-1">{line.slice(2)}</li>
        }
        if (/^\d+\./.test(line.trim())) {
          return <li key={i} className="ml-4 mb-1 list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>
        }
        if (line.trim() === '') {
          return <div key={i} className="h-4" />
        }
        return <p key={i} className="leading-relaxed mb-2">{line}</p>
      })}
    </div>
  )
}

function VocabularyList({ vocabulary }: { vocabulary: Array<{ word: string; translation: string; example: string }> }) {
  return (
    <Card className="bg-zinc-900/50 border-blue-500/20">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <BookOpen className="h-4 w-4 text-blue-400" />
        <h3 className="font-medium text-zinc-100">Vocabulário da lição ({vocabulary.length})</h3>
      </div>
      <div className="divide-y divide-zinc-800/50 p-3">
        {vocabulary.map((v) => (
          <div key={v.word} className="py-2 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-100">{v.word}</p>
              <p className="text-xs text-zinc-500">{v.translation}</p>
              <p className="text-xs text-zinc-400 italic mt-0.5">{v.example}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Ouvir pronúncia">
              <Volume2 className="h-4 w-4 text-zinc-500 hover:text-zinc-300" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ProgressDots({ current, total, onClick }: { current: number; total: number; onClick: (i: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-zinc-800">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onClick(i)}
          className={cn(
            'h-2 w-2 rounded-full transition-colors',
            i < current ? 'bg-blue-500' : i === current ? 'bg-blue-500/50 ring-2 ring-blue-500/30' : 'bg-zinc-700 hover:bg-zinc-600',
          )}
          aria-label={`Ir para seção ${i + 1}`}
        />
      ))}
    </div>
  )
}

export function LessonPlayer({ course, lesson, onNavigate, onComplete, hasPrev, hasNext, progress }: LessonPlayerProps) {
  const [vocabOpen, setVocabOpen] = useState(false)

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[calc(100vh-200px)]">
      {/* Header with navigation */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('prev')} disabled={!hasPrev} aria-label="Lição anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">{course.title}</p>
          <h2 className="font-display text-lg font-semibold text-zinc-100 truncate">{lesson.title}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onNavigate('next')} disabled={!hasNext} aria-label="Próxima lição">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <MarkdownContent content={lesson.content} />

          {/* Vocabulary section */}
          {lesson.vocabulary.length > 0 && (
            <div>
              <Button
                variant="soft"
                size="sm"
                className="bg-blue-500/15 text-blue-300 border-blue-500/30"
                onClick={() => setVocabOpen(!vocabOpen)}
              >
                {vocabOpen ? 'Ocultar vocabulário' : 'Ver vocabulário'} ({lesson.vocabulary.length} palavras)
              </Button>
              {vocabOpen && <VocabularyList vocabulary={lesson.vocabulary} />}
            </div>
          )}

          {/* Completion / Next action */}
          <div className="pt-4 border-t border-zinc-800">
            {lesson.completed ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Lição concluída! Parabéns!</span>
              </div>
            ) : (
              <Button variant="primary" size="lg" className="w-full" onClick={onComplete}>
                Marcar como concluída e ir para o Quiz
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <ProgressDots current={progress} total={course.lessons.length} onClick={(i) => onNavigate(i > progress ? 'next' : 'prev')} />
    </div>
  )
}