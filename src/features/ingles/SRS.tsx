import { useState, useEffect, useCallback } from 'react'
import { Brain, RefreshCw, Volume2, CheckCircle2, XCircle, RotateCcw, type LucideIcon } from 'lucide-react'
import type { SRSFlashcard, VocabItem } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/feedback'
import { cn, todayStr } from '@/lib/utils'
import { api } from '@/data/api'

// SM-2 Algorithm implementation
function sm2Algorithm(card: SRSFlashcard, quality: 0 | 1 | 2 | 3 | 4 | 5): Partial<SRSFlashcard> {
  let { interval, easeFactor, repetitions, state } = card
  const today = todayStr()

  if (quality >= 3) {
    // Correct response
    if (state === 0) {
      // New card -> learning
      interval = 1
      state = 1
    } else if (state === 1) {
      // Learning -> review
      interval = 6
      state = 2
    } else {
      // Review
      interval = Math.round(interval * easeFactor)
    }
    repetitions += 1
    // Adjust ease factor
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  } else {
    // Incorrect response - reset
    interval = 1
    repetitions = 0
    state = 0
    easeFactor = Math.max(1.3, easeFactor - 0.2)
  }

  // Calculate next review date
  const nextReviewDate = new Date()
  nextReviewDate.setDate(nextReviewDate.getDate() + interval)
  const nextReview = nextReviewDate.toISOString().slice(0, 10)

  return {
    interval,
    easeFactor: Number(easeFactor.toFixed(2)),
    repetitions,
    state,
    nextReview,
    lastReviewed: today,
  }
}

function getDueCards(cards: SRSFlashcard[]): SRSFlashcard[] {
  const today = todayStr()
  return cards.filter((c) => c.nextReview <= today).sort((a, b) => a.nextReview.localeCompare(b.nextReview))
}

function getStats(cards: SRSFlashcard[]) {
  const today = todayStr()
  const due = cards.filter((c) => c.nextReview <= today).length
  const learning = cards.filter((c) => c.state === 1).length
  const review = cards.filter((c) => c.state === 2).length
  const newCards = cards.filter((c) => c.state === 0).length
  return { due, learning, review, newCards, total: cards.length }
}

interface SRSCardProps {
  card: SRSFlashcard
  onGrade: (quality: 0 | 1 | 2 | 3 | 4 | 5) => void
  showAnswer: boolean
  onToggleAnswer: () => void
  index: number
  total: number
}

function SRSCard({ card, onGrade, showAnswer, onToggleAnswer, index, total }: SRSCardProps) {
  const grades = [
    { value: 0, label: 'Novamente', color: 'bg-rose-500', desc: 'Errou completamente' },
    { value: 1, label: 'Difícil', color: 'bg-orange-500', desc: 'Errou, mas lembrava parte' },
    { value: 2, label: 'Quase', color: 'bg-amber-500', desc: 'Quase acertou' },
    { value: 3, label: 'Bom', color: 'bg-emerald-500', desc: 'Acertou com esforço' },
    { value: 4, label: 'Fácil', color: 'bg-teal-500', desc: 'Acertou facilmente' },
    { value: 5, label: 'Perfeito', color: 'bg-blue-500', desc: 'Acertou instantaneamente' },
  ] as const

  return (
    <Card className="max-w-2xl mx-auto w-full">
      <div className="p-6">
        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-zinc-500">Cartão {index + 1} de {total}</span>
          <span className="chip bg-blue-500/15 text-blue-300 border-blue-500/30 text-xs">
            Próxima revisão: {card.nextReview === todayStr() ? 'Hoje' : card.nextReview}
          </span>
        </div>

        {/* Card content */}
        <div className="space-y-6">
          {/* Front - Word */}
          <div className="text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Palavra / Expressão</p>
            <h1 className="font-display text-4xl font-bold text-zinc-100 mb-2">{card.word}</h1>
            <p className="text-zinc-400 italic text-lg">"{card.example}"</p>
          </div>

          {/* Flip button / Answer */}
          {!showAnswer ? (
            <Button variant="primary" size="lg" className="w-full py-4" onClick={onToggleAnswer}>
              <RotateCcw className="h-5 w-5 mr-2" />
              Mostrar resposta
            </Button>
          ) : (
            <>
              <div className="border-t border-zinc-800 pt-6 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Tradução</p>
                <h2 className="font-display text-3xl font-semibold text-emerald-300 mb-4">{card.translation}</h2>
                <p className="text-zinc-400 italic">"{card.example}"</p>
              </div>

              {/* Grading buttons */}
              <div className="border-t border-zinc-800 pt-6">
                <p className="text-xs text-zinc-500 text-center mb-4">Quão fácil foi lembrar?</p>
                <div className="grid grid-cols-3 gap-2">
                  {grades.map((g) => (
                    <Button
                      key={g.value}
                      variant="soft"
                      size="sm"
                      className={cn('h-20 flex flex-col gap-1 py-3', g.color.replace('bg-', 'bg-').replace('500', '500/20'), 'border-' + g.color.replace('bg-', '').replace('500', '500/40'))}
                      onClick={() => onGrade(g.value as 0 | 1 | 2 | 3 | 4 | 5)}
                    >
                      <span className="font-medium text-sm">{g.label}</span>
                      <span className="text-[10px] text-zinc-500">{g.desc}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

function SRSStats({ cards }: { cards: SRSFlashcard[] }) {
  const stats = getStats(cards)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-4 text-center bg-emerald-500/10 border-emerald-500/20">
        <p className="font-display text-2xl font-bold text-emerald-400">{stats.due}</p>
        <p className="text-xs text-zinc-500">Para revisar hoje</p>
      </Card>
      <Card className="p-4 text-center bg-blue-500/10 border-blue-500/20">
        <p className="font-display text-2xl font-bold text-blue-400">{stats.newCards}</p>
        <p className="text-xs text-zinc-500">Novos</p>
      </Card>
      <Card className="p-4 text-center bg-amber-500/10 border-amber-500/20">
        <p className="font-display text-2xl font-bold text-amber-400">{stats.learning}</p>
        <p className="text-xs text-zinc-500">Em aprendizado</p>
      </Card>
      <Card className="p-4 text-center bg-violet-500/10 border-violet-500/20">
        <p className="font-display text-2xl font-bold text-violet-400">{stats.review}</p>
        <p className="text-xs text-zinc-500">Em revisão</p>
      </Card>
    </div>
  )
}

interface SRSProps {
  initialCards?: SRSFlashcard[]
  onClose: () => void
}

export function SRS({ initialCards, onClose }: SRSProps) {
  const [cards, setCards] = useState<SRSFlashcard[]>(initialCards ?? [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load cards from API on mount
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const data = await api.list<SRSFlashcard>('srsFlashcards')
      if (alive) {
        setCards(data)
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const dueCards = getDueCards(cards)
  const currentCard = dueCards[currentIndex]

  const handleGrade = useCallback(async (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!currentCard) return

    const updates = sm2Algorithm(currentCard, quality)
    const updatedCard = { ...currentCard, ...updates }

    // Persist to API
    await api.update<SRSFlashcard>('srsFlashcards', currentCard.id, updatedCard)

    // Update local state
    setCards((prev) => prev.map((c) => (c.id === currentCard.id ? updatedCard : c)))

    // Next card
    setShowAnswer(false)
    if (currentIndex < dueCards.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      setSessionComplete(true)
    }
  }, [currentCard, currentIndex, dueCards.length])

  const handleToggleAnswer = () => setShowAnswer(true)

  const handleAddVocab = async (vocab: VocabItem) => {
    const newCard: Omit<SRSFlashcard, 'id'> = {
      userId: 'user-1',
      vocabId: vocab.id,
      word: vocab.word,
      translation: vocab.translation,
      example: vocab.example,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: todayStr(),
      state: 0,
    }
    const created = await api.create<SRSFlashcard>('srsFlashcards', newCard)
    setCards((prev) => [created, ...prev])
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        <p className="mt-4 text-zinc-400">Carregando flashcards...</p>
      </div>
    )
  }

  if (sessionComplete || dueCards.length === 0) {
    const stats = getStats(cards)
    return (
      <div className="flex flex-col h-[calc(100vh-200px)]">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="font-medium text-zinc-100">SRS Flashcards</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <Brain className="h-10 w-10 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-zinc-100">
                {dueCards.length === 0 ? 'Nenhum cartão para revisar hoje!' : 'Sessão concluída!'}
              </h3>
              <p className="mt-2 text-zinc-400">
                {dueCards.length === 0
                  ? 'Todos os seus cartões estão em dia. Volte amanhã para novas revisões.'
                  : `Você revisou ${dueCards.length} cartões. Ótimo trabalho!`}
              </p>
            </div>

            <SRSStats cards={cards} />

            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="primary" size="lg" onClick={() => { setCurrentIndex(0); setSessionComplete(false); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Revisar novamente
              </Button>
              <Button variant="ghost" size="lg" onClick={onClose}>
                Voltar ao curso
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-400" />
          <h2 className="font-medium text-zinc-100">SRS Flashcards</h2>
          <span className="chip bg-blue-500/15 text-blue-300 border-blue-500/30 text-xs">
            {currentIndex + 1} / {dueCards.length}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <SRSCard
          card={currentCard}
          onGrade={handleGrade}
          showAnswer={showAnswer}
          onToggleAnswer={handleToggleAnswer}
          index={currentIndex}
          total={dueCards.length}
        />
      </div>

      {/* Progress bar at bottom */}
      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur sticky bottom-0 z-10">
        <ProgressBar value={((currentIndex + 1) / dueCards.length) * 100} tone="blue" className="mb-2" />
        <p className="text-xs text-zinc-500 text-center">
          {dueCards.length - currentIndex - 1} cartões restantes nesta sessão
        </p>
      </div>
    </div>
  )
}