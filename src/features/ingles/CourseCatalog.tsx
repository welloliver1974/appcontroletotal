import { Play, CheckCircle2, BookOpen, Brain, MessageSquare, Sparkles, type LucideIcon } from 'lucide-react'
import type { Course, Lesson } from '@/data/types'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/feedback'
import { IconTile } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

const AREA_ICONS: Record<string, LucideIcon> = {
  grammar: BookOpen,
  vocabulary: Sparkles,
  listening: MessageSquare,
  reading: BookOpen,
  speaking: MessageSquare,
}

const AREA_LABELS: Record<string, string> = {
  grammar: 'Gramática',
  vocabulary: 'Vocabulário',
  listening: 'Listening',
  reading: 'Leitura',
  speaking: 'Speaking',
}

const AREA_COLORS: Record<string, string> = {
  grammar: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  vocabulary: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  listening: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  reading: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  speaking: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

interface CourseCatalogProps {
  courses: Course[]
  onSelectLesson: (course: Course, lesson: Lesson) => void
  onStartSRS: () => void
  onStartRoleplay: () => void
}

function CourseCard({ course, onSelectLesson }: { course: Course; onSelectLesson: (course: Course, lesson: Lesson) => void }) {
  const nextLesson = course.lessons.find((l) => !l.completed) || course.lessons[course.lessons.length - 1]
  const completedLessons = course.lessons.filter((l) => l.completed).length

  return (
    <Card className="flex flex-col h-full">
      <CardHeader
        title={course.title}
        subtitle={`${course.lessons.length} lições · ${course.level} · ${completedLessons}/${course.lessons.length} concluídas`}
        className="pb-0"
      />

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {course.lessons.map((lesson, idx) => {
          const Icon = AREA_ICONS[lesson.area] || BookOpen
          const isNext = lesson === nextLesson && !lesson.completed
          const isLocked = idx > 0 && !course.lessons[idx - 1].completed

          return (
            <button
              key={lesson.id}
              type="button"
              onClick={() => !isLocked && onSelectLesson(course, lesson)}
              disabled={isLocked}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all text-left w-full',
                isNext
                  ? 'border-blue-500/40 bg-blue-500/10'
                  : lesson.completed
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : isLocked
                  ? 'border-zinc-800 bg-zinc-900/50 opacity-60'
                  : 'border-zinc-800 hover:border-zinc-700 bg-white/5',
              )}
            >
              <IconTile
                icon={Icon}
                size="sm"
                className={cn(
                  AREA_COLORS[lesson.area] || 'bg-zinc-800 text-zinc-400 border-zinc-700',
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate text-zinc-100">{lesson.title}</span>
                  {lesson.completed && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                  {isLocked && <span className="chip text-[10px] bg-zinc-800 text-zinc-500">Bloqueada</span>}
                  {isNext && !lesson.completed && <span className="chip text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">Próxima</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                  <span className="chip px-2 py-0.5 bg-zinc-800 border-zinc-700">{AREA_LABELS[lesson.area]}</span>
                  <span>{lesson.estimatedMinutes} min</span>
                </div>
              </div>
              {lesson.completed ? (
                <span className="chip bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-xs">Concluída</span>
              ) : isLocked ? (
                <span className="chip bg-zinc-800 text-zinc-500 text-xs">🔒</span>
              ) : (
                <Button variant="primary" size="sm" className="h-8">
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}
            </button>
          )
        })}
      </div>

      {/* Course progress */}
      <div className="border-t border-zinc-800 pt-4 mt-auto">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-zinc-400">Progresso do curso</span>
          <span className="font-num font-medium text-zinc-100">{course.progress}%</span>
        </div>
        <ProgressBar value={course.progress} tone="blue" />
      </div>
    </Card>
  )
}

function QuickActions({ onStartSRS, onStartRoleplay }: { onStartSRS: () => void; onStartRoleplay: () => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card className="p-5 h-full flex flex-col items-center justify-center text-center border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors cursor-pointer group"
        onClick={onStartSRS}>
        <div className="h-14 w-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
          <Brain className="h-7 w-7 text-violet-400" />
        </div>
        <h3 className="font-medium text-zinc-100 mb-1">SRS Flashcards</h3>
        <p className="text-xs text-zinc-500">Revisão espaçada do vocabulário</p>
      </Card>

      <Card className="p-5 h-full flex flex-col items-center justify-center text-center border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-colors cursor-pointer group"
        onClick={onStartRoleplay}>
        <div className="h-14 w-14 rounded-2xl bg-rose-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
          <MessageSquare className="h-7 w-7 text-rose-400" />
        </div>
        <h3 className="font-medium text-zinc-100 mb-1">Free Conversation</h3>
        <p className="text-xs text-zinc-500">Roleplay com Hermes (IA)</p>
      </Card>
    </div>
  )
}

export function CourseCatalog({ courses, onSelectLesson, onStartSRS, onStartRoleplay }: CourseCatalogProps) {
  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
          <h3 className="font-display text-lg font-semibold text-zinc-100 mb-2">Nenhum curso disponível</h3>
          <p className="text-zinc-500">Cursos aparecerão aqui quando cadastrados.</p>
        </div>
        <QuickActions onStartSRS={onStartSRS} onStartRoleplay={onStartRoleplay} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} onSelectLesson={onSelectLesson} />
        ))}
      </div>

      <div className="pt-4 border-t border-zinc-800">
        <h3 className="eyebrow text-blue-400 mb-3">Prática extra</h3>
        <QuickActions onStartSRS={onStartSRS} onStartRoleplay={onStartRoleplay} />
      </div>
    </div>
  )
}