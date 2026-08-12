import { useState } from 'react'
import { CheckCircle2, XCircle, ArrowRight, RefreshCw, Brain } from 'lucide-react'
import type { QuizQuestion } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface QuizProps {
  questions: QuizQuestion[]
  onComplete: (score: number) => void
  onExit: () => void
}

type AnswerState = Record<string, string | string[]>

function QuestionCard({
  question,
  index,
  total,
  answer,
  onAnswer,
  showResult,
  correctAnswer,
}: {
  question: QuizQuestion
  index: number
  total: number
  answer: string | string[]
  onAnswer: (ans: string | string[]) => void
  showResult: boolean
  correctAnswer: string | string[]
}) {
  const isCorrect = showResult && (
    Array.isArray(answer)
      ? JSON.stringify([...answer].sort()) === JSON.stringify([...(Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer])].sort())
      : answer === correctAnswer
  )

  const isWrong = showResult && !isCorrect && answer !== ''

  const renderOptions = () => {
    if (question.type === 'multiple_choice' && question.options) {
      return question.options.map((opt, i) => (
        <button
          key={i}
          type="button"
          onClick={() => !showResult && onAnswer(opt)}
          className={cn(
            'w-full text-left px-4 py-3 rounded-xl border transition-all',
            showResult
              ? opt === correctAnswer
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : opt === answer
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : 'border-zinc-800 text-zinc-400'
              : opt === answer
              ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
              : 'border-zinc-800 hover:border-zinc-700 text-zinc-300',
          )}
          disabled={showResult}
        >
          <span className="flex items-center gap-3">
            <span className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
              showResult
                ? opt === correctAnswer
                  ? 'border-emerald-500 bg-emerald-500'
                  : opt === answer
                  ? 'border-rose-500 bg-rose-500'
                  : 'border-zinc-700'
                : opt === answer
                ? 'border-blue-500 bg-blue-500'
                : 'border-zinc-700',
            )}>
              {showResult && opt === correctAnswer && <CheckCircle2 className="h-3.5 w-3.5 text-zinc-900" />}
              {showResult && opt === answer && opt !== correctAnswer && <XCircle className="h-3.5 w-3.5 text-zinc-900" />}
              {!showResult && opt === answer && <span className="h-2.5 w-2.5 rounded-full bg-zinc-900" />}
            </span>
            <span>{opt}</span>
          </span>
        </button>
      ))
    }

    if (question.type === 'fill_blank') {
      return (
        <input
          type="text"
          className={cn(
            'input-base w-full text-center text-lg font-medium',
            showResult && isCorrect && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
            showResult && isWrong && 'border-rose-500/40 bg-rose-500/10 text-rose-300',
          )}
          value={typeof answer === 'string' ? answer : ''}
          onChange={(e) => !showResult && onAnswer(e.target.value)}
          placeholder="Digite sua resposta..."
          disabled={showResult}
          autoComplete="off"
        />
      )
    }

    if (question.type === 'translation') {
      return (
        <textarea
          className={cn(
            'input-base w-full min-h-[100px] resize-y',
            showResult && isCorrect && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
            showResult && isWrong && 'border-rose-500/40 bg-rose-500/10 text-rose-300',
          )}
          value={typeof answer === 'string' ? answer : ''}
          onChange={(e) => !showResult && onAnswer(e.target.value)}
          placeholder="Traduza para o inglês..."
          disabled={showResult}
        />
      )
    }

    return null
  }

  return (
    <Card className={cn('overflow-hidden', showResult && isCorrect && 'ring-1 ring-emerald-500/30')}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="chip bg-blue-500/15 text-blue-300 border-blue-500/30">
            Questão {index + 1} de {total}
          </span>
          <span className="chip bg-zinc-800 text-zinc-400">{question.type.replace('_', ' ')}</span>
        </div>

        <p className="text-lg font-medium text-zinc-100 leading-relaxed">{question.prompt}</p>

        <div className="space-y-2">{renderOptions()}</div>

        {showResult && question.explanation && (
          <div className="pt-3 border-t border-zinc-800 bg-zinc-900/50 rounded-xl p-3">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Explicação</p>
            <p className="text-sm text-zinc-300">{question.explanation}</p>
          </div>
        )}

        {showResult && (
          <div className={cn('flex items-center gap-2 pt-2', isCorrect ? 'text-emerald-400' : 'text-rose-400')}>
            {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <span className="font-medium">{isCorrect ? 'Correto!' : 'Incorreto'}</span>
            {Array.isArray(correctAnswer) ? (
              <span className="text-xs text-zinc-500">Resposta: {correctAnswer.join(' / ')}</span>
            ) : (
              <span className="text-xs text-zinc-500">Resposta: {correctAnswer}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function ResultsScreen({
  score,
  total,
  onRetry,
  onExit,
}: {
  score: number
  total: number
  onRetry: () => void
  onExit: () => void
}) {
  const percentage = Math.round((score / total) * 100)
  const passed = percentage >= 70

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className={cn('h-24 w-24 rounded-full flex items-center justify-center', passed ? 'bg-emerald-500/20' : 'bg-rose-500/20')}>
        {passed ? (
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        ) : (
          <XCircle className="h-12 w-12 text-rose-400" />
        )}
      </div>

      <div>
        <h2 className="font-display text-3xl font-bold text-zinc-100">
          {passed ? 'Parabéns!' : 'Continue praticando'}
        </h2>
        <p className="mt-2 text-zinc-400">
          Você acertou <span className="font-display text-2xl font-bold text-zinc-100">{score}</span> de{' '}
          <span className="font-display text-2xl font-bold text-zinc-100">{total}</span> questões
        </p>
        <p className="mt-1 text-zinc-500">{percentage}% de aproveitamento</p>
      </div>

      <div className="flex items-center justify-center gap-3 w-full max-w-sm">
        <Button variant={passed ? 'primary' : 'soft'} size="lg" className="flex-1" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
        <Button variant="ghost" size="lg" className="flex-1" onClick={onExit}>
          Voltar ao curso
        </Button>
      </div>

      {passed && (
        <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
          <Brain className="h-4 w-4" />
          <span>Quiz aprovado! Esta lição será marcada como concluída.</span>
        </div>
      )}
    </div>
  )
}

export function Quiz({ questions, onComplete, onExit }: QuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerState>({})
  const [showResult, setShowResult] = useState(false)
  const [finished, setFinished] = useState(false)

  const question = questions[currentIndex]
  const answer = answers[question.id] ?? ''

  const handleAnswer = (ans: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [question.id]: ans }))
  }

  const handleSubmit = () => {
    if (answer === '' && question.type !== 'multiple_choice') return
    setShowResult(true)
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
      setShowResult(false)
    } else {
      // Calculate score
      let score = 0
      questions.forEach((q) => {
        const userAns = answers[q.id]
        if (userAns !== undefined && userAns !== '') {
          const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]
          const user = Array.isArray(userAns) ? userAns : [userAns]
          const match = user.some((u) => correct.some((c) => c.toLowerCase().trim() === u.toLowerCase().trim()))
          if (match) score++
        }
      })
      setFinished(true)
      onComplete(score)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setCurrentIndex(0)
    setShowResult(false)
    setFinished(false)
  }

  if (finished) {
    const score = questions.reduce((acc, q) => {
      const userAns = answers[q.id]
      if (userAns !== undefined && userAns !== '') {
        const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer]
        const user = Array.isArray(userAns) ? userAns : [userAns]
        const match = user.some((u) => correct.some((c) => c.toLowerCase().trim() === u.toLowerCase().trim()))
        return acc + (match ? 1 : 0)
      }
      return acc
    }, 0)
    return <ResultsScreen score={score} total={questions.length} onRetry={handleRetry} onExit={onExit} />
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[calc(100vh-200px)]">
      {/* Progress header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h3 className="font-medium text-zinc-100">Quiz da lição</h3>
          <Button variant="ghost" size="sm" onClick={onExit}>
            Sair
          </Button>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500 text-center">
          Questão {currentIndex + 1} de {questions.length}
        </p>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto w-full">
          <QuestionCard
            question={question}
            index={currentIndex}
            total={questions.length}
            answer={answer}
            onAnswer={handleAnswer}
            showResult={showResult}
            correctAnswer={question.correctAnswer}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="px-4 py-4 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur sticky bottom-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentIndex((i) => i - 1)
                setShowResult(false)
              }
            }}
            disabled={currentIndex === 0}
          >
            Anterior
          </Button>

          {showResult ? (
            <Button variant="primary" size="lg" onClick={handleNext} className="flex-1">
              {currentIndex < questions.length - 1 ? (
                <>Próxima <ArrowRight className="h-4 w-4 ml-2" /></>
              ) : (
                'Ver resultado'
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={
                question.type === 'multiple_choice' ? answer === '' : answer === ''
              }
              className="flex-1"
            >
              Responder
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}