import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/data/api'
import type { Course, Lesson, QuizQuestion, SRSFlashcard, RoleplaySession, VocabItem } from '@/data/types'

export interface InglesData {
  courses: Course[]
  quizQuestions: QuizQuestion[]
  srsFlashcards: SRSFlashcard[]
  roleplaySessions: RoleplaySession[]
}

export function useInglesData() {
  const [data, setData] = useState<InglesData | null>(null)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    const [courses, quizQuestions, srsFlashcards, roleplaySessions] = await Promise.all([
      api.list<Course>('courses'),
      api.list<QuizQuestion>('quizQuestions'),
      api.list<SRSFlashcard>('srsFlashcards'),
      api.list<RoleplaySession>('roleplaySessions'),
    ])
    if (alive.current) setData({ courses, quizQuestions, srsFlashcards, roleplaySessions })
  }, [])

  useEffect(() => {
    alive.current = true
    void reload()
    return () => {
      alive.current = false
    }
  }, [reload])

  const setCourses = useCallback((courses: Course[]) => setData((d) => (d ? { ...d, courses } : d)), [])
  const setQuizQuestions = useCallback((quizQuestions: QuizQuestion[]) => setData((d) => (d ? { ...d, quizQuestions } : d)), [])
  const setSrsFlashcards = useCallback((srsFlashcards: SRSFlashcard[]) => setData((d) => (d ? { ...d, srsFlashcards } : d)), [])
  const setRoleplaySessions = useCallback((roleplaySessions: RoleplaySession[]) => setData((d) => (d ? { ...d, roleplaySessions } : d)), [])

  return { data, reload, setCourses, setQuizQuestions, setSrsFlashcards, setRoleplaySessions }
}