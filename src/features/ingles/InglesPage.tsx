import { useState, useCallback } from 'react'
import { api } from '@/data/api'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/feedback'
import { useInglesData } from './useInglesData'
import { CourseCatalog } from './CourseCatalog'
import { LessonPlayer } from './LessonPlayer'
import { Quiz } from './Quiz'
import { SRS } from './SRS'
import { Roleplay } from './Roleplay'
import type { Course, Lesson } from '@/data/types'

function InglesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card space-y-4 p-5 h-96">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-3 w-32 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )
}

type ViewMode = 'catalog' | 'lesson' | 'quiz' | 'srs' | 'roleplay'

/** Fase 6 — Inglês B1: Catálogo de cursos, Lesson Player, Quiz, SRS, Free Conversation. */
export function InglesPage() {
  const module = MODULE_BY_ID['ingles']
  const { data, setCourses } = useInglesData()

  const [view, setView] = useState<ViewMode>('catalog')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  // Calculate progress for current course
  const currentCourse = selectedCourse || data?.courses[0]
  const completedCount = currentCourse?.lessons.filter((l) => l.completed).length ?? 0
  const totalLessons = currentCourse?.lessons.length ?? 0
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const handleSelectLesson = useCallback((course: Course, lesson: Lesson) => {
    setSelectedCourse(course)
    setSelectedLesson(lesson)
    setView('lesson')
  }, [])

  const handleLessonNavigate = useCallback((direction: 'prev' | 'next') => {
    if (!selectedCourse || !selectedLesson) return
    const idx = selectedCourse.lessons.findIndex((l) => l.id === selectedLesson.id)
    const newIdx = direction === 'next' ? idx + 1 : idx - 1
    if (newIdx >= 0 && newIdx < selectedCourse.lessons.length) {
      setSelectedLesson(selectedCourse.lessons[newIdx])
    }
  }, [selectedCourse, selectedLesson])

  const handleLessonComplete = useCallback(async () => {
    if (!selectedCourse || !selectedLesson || !data) return
    const updatedLessons = selectedCourse.lessons.map((l) =>
      l.id === selectedLesson.id ? { ...l, completed: true, completedAt: new Date().toISOString() } : l
    )
    const updatedProgress = Math.round((updatedLessons.filter(l => l.completed).length / updatedLessons.length) * 100)
    const updatedCourse = { ...selectedCourse, lessons: updatedLessons, progress: updatedProgress }
    await api.update<Course>('courses', selectedCourse.id, { lessons: updatedLessons, progress: updatedProgress })
    setCourses(data.courses.map((c) => (c.id === selectedCourse.id ? updatedCourse : c)))
    setSelectedCourse(updatedCourse)
    // Get quiz questions for this lesson
    const questions = data.quizQuestions.filter((q) => q.lessonId === selectedLesson.id)
    if (questions.length > 0) {
      setView('quiz')
    }
  }, [selectedCourse, selectedLesson, data, setCourses])

  const handleQuizComplete = useCallback((score: number) => {
    // Mark lesson as fully completed with score
    if (!selectedCourse || !selectedLesson || !data) return
    const updatedLessons = selectedCourse.lessons.map((l) =>
      l.id === selectedLesson.id ? { ...l, completed: true, score, completedAt: new Date().toISOString() } : l
    )
    const updatedCourse = { ...selectedCourse, lessons: updatedLessons, progress: Math.round((updatedLessons.filter(l => l.completed).length / updatedLessons.length) * 100) }
    setCourses(data.courses.map((c) => (c.id === selectedCourse.id ? updatedCourse : c)))
    setSelectedCourse(updatedCourse)
    setView('catalog')
  }, [selectedCourse, selectedLesson, data, setCourses])

  const handleQuizExit = useCallback(() => {
    setView('catalog')
  }, [])

  const handleSRSClose = useCallback(() => {
    setView('catalog')
  }, [])

  const handleRoleplayClose = useCallback(() => {
    setView('catalog')
  }, [])

  const handleRoleplaySave = useCallback(async (session: { id: string }) => {
    // Session saved via API in Roleplay component
    console.log('Roleplay session saved:', session.id)
  }, [])

  // Render current view
  const renderView = () => {
    switch (view) {
      case 'lesson':
        if (!selectedCourse || !selectedLesson) return null
        return (
          <LessonPlayer
            course={selectedCourse}
            lesson={selectedLesson}
            onNavigate={handleLessonNavigate}
            onComplete={handleLessonComplete}
            hasPrev={selectedCourse.lessons.findIndex((l) => l.id === selectedLesson.id) > 0}
            hasNext={selectedCourse.lessons.findIndex((l) => l.id === selectedLesson.id) < selectedCourse.lessons.length - 1}
            progress={selectedCourse.lessons.findIndex((l) => l.id === selectedLesson.id)}
          />
        )

      case 'quiz':
        if (!selectedLesson || !data) return null
        const questions = data.quizQuestions.filter((q) => q.lessonId === selectedLesson.id)
        if (questions.length === 0) return null
        return (
          <Quiz
            questions={questions}
            onComplete={handleQuizComplete}
            onExit={handleQuizExit}
          />
        )

      case 'srs':
        return <SRS onClose={handleSRSClose} />

      case 'roleplay':
        return <Roleplay onClose={handleRoleplayClose} onSave={handleRoleplaySave} />

      default:
        return (
          <CourseCatalog
            courses={data?.courses ?? []}
            onSelectLesson={handleSelectLesson}
            onStartSRS={() => setView('srs')}
            onStartRoleplay={() => setView('roleplay')}
          />
        )
    }
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <PageHeader module={module} />

      {!data ? (
        <InglesSkeleton />
      ) : (
        <div className="flex-1 overflow-hidden">
          {renderView()}
        </div>
      )}
    </div>
  )
}