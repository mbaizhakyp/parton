/**
 * The Dolly trivia quiz (F2) — intro → one question per screen → result →
 * share. Lives in the `(app)/` tier (dynamic, signed-out capable): the
 * leaderboard is real-time and visible to visitors; starting the quiz
 * prompts sign-in via the app's <AuthOverlay/> (same pattern as the wall).
 *
 * Grading is server-side only — src/server/quiz-data.ts (the answer key)
 * is never imported here. This page only knows the client-safe prompts/
 * options from src/components/quiz/questions.ts, and learns whether a pick
 * was correct (plus the fact note) from the answerQuestion action's
 * response. The final score comes back from submitQuiz, which re-grades
 * every answer server-side — nothing the client claims is trusted.
 *
 * See docs/requirements.md F2 + F5 and references/design/forever-dolly-app-notes.md
 * (Quiz / Quiz content / Share modal sections) for the exact copy and styles.
 */

import { useEffect, useState, type CSSProperties } from 'react'
import { useAuthProfileReady, AuthOverlay } from 'deepspace'
import { callAction } from '../../lib/callAction'
import { useToast } from '@/components/ui'
import { CLIENT_QUESTIONS, QUIZ_TITLE } from '@/components/quiz/questions'
import { Leaderboard } from '@/components/quiz/Leaderboard'
import { ShareModal } from '@/components/quiz/ShareModal'
import { rankLine, rankQuip } from '@/components/quiz/rank'

const GOLD = '#C9922A'
const PINK = '#D4497A'
const BORDER = '#EDD9C8'
const MUTED = '#8A6F73'
const TEXT = '#3D2B2E'
const PLAYFAIR = "'Playfair Display', serif"
const TOTAL = CLIENT_QUESTIONS.length

const GOLD_BUTTON: CSSProperties = {
  border: '1px solid #C9922A',
  background: 'linear-gradient(180deg,#E0AE4E,#C9922A)',
  color: '#FFF9E8',
  fontWeight: 600,
  borderRadius: 999,
  boxShadow: '0 2px 8px rgba(201,146,42,0.25)',
}

const OUTLINE_GOLD_BUTTON: CSSProperties = {
  border: `1px solid ${GOLD}`,
  background: 'transparent',
  color: GOLD,
  fontWeight: 600,
  borderRadius: 999,
}

/** Idempotently ensures Playfair Display is loaded — the share card (F5)
 *  needs it decoded before html-to-image snapshots it. */
function useEnsurePlayfairFont() {
  useEffect(() => {
    const href =
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap'
    if (document.querySelector(`link[href="${href}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }, [])
}

interface Reveal {
  chosenIndex: number
  correct: boolean
  correctIndex: number
  note: string
}

interface QuizResult {
  score: number
  total: number
  best: number
}

type Stage = 'intro' | 'quiz' | 'result'

export default function QuizPage() {
  useEnsurePlayfairFont()

  const { isLoaded, isSignedIn } = useAuthProfileReady()
  const { error } = useToast()

  const [stage, setStage] = useState<Stage>('intro')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [answering, setAnswering] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  function startQuiz() {
    if (isLoaded && !isSignedIn) {
      setShowAuthModal(true)
      return
    }
    setCurrentIndex(0)
    setAnswers({})
    setReveal(null)
    setResult(null)
    setStage('quiz')
  }

  async function handleAnswer(optionIndex: number) {
    if (reveal || answering) return
    const question = CLIENT_QUESTIONS[currentIndex]
    setAnswering(true)
    const res = await callAction('answerQuestion', {
      questionId: question.id,
      chosenIndex: optionIndex,
    })
    setAnswering(false)
    if (!res.success) {
      error('Could not grade that answer', res.error)
      return
    }
    const data = res.data as { correct: boolean; correctIndex: number; note: string }
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))
    setReveal({ chosenIndex: optionIndex, ...data })
  }

  async function handleNext() {
    const isLast = currentIndex === TOTAL - 1
    if (!isLast) {
      setCurrentIndex((i) => i + 1)
      setReveal(null)
      return
    }

    setSubmitting(true)
    const payload = Object.entries(answers).map(([questionId, chosenIndex]) => ({
      questionId,
      chosenIndex,
    }))
    const res = await callAction('submitQuiz', { answers: payload })
    setSubmitting(false)
    if (!res.success) {
      error('Could not submit your score', res.error)
      return
    }
    setResult(res.data as QuizResult)
    setStage('result')
  }

  return (
    <div className="mx-auto min-h-full max-w-[1040px] px-4 py-8" data-testid="quiz-page">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="mx-auto w-full max-w-[680px] lg:mx-0">
          {stage === 'intro' && <IntroCard onStart={startQuiz} />}

          {stage === 'quiz' && (
            <QuestionCard
              index={currentIndex}
              total={TOTAL}
              question={CLIENT_QUESTIONS[currentIndex]}
              reveal={reveal}
              answering={answering}
              submitting={submitting}
              isLast={currentIndex === TOTAL - 1}
              onAnswer={handleAnswer}
              onNext={handleNext}
            />
          )}

          {stage === 'result' && result && (
            <ResultCard
              result={result}
              onShare={() => setShowShareModal(true)}
              onPlayAgain={() => setStage('intro')}
            />
          )}
        </div>

        <div className="w-full lg:sticky lg:top-[86px] lg:w-[300px] lg:shrink-0">
          <Leaderboard />
        </div>
      </div>

      {showAuthModal && (
        <AuthOverlay
          onClose={() => setShowAuthModal(false)}
          title="Sign in to play the quiz"
          description="Your score joins the live leaderboard — every note has a name."
        />
      )}

      {showShareModal && result && (
        <ShareModal score={result.score} total={result.total} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  )
}

function IntroCard({ onStart }: { onStart: () => void }) {
  return (
    <div
      data-testid="quiz-intro"
      className="rounded-[18px] px-8 py-10 text-center"
      style={{ background: 'linear-gradient(170deg,#FBEAEE,#FFF9E8)' }}
    >
      <div style={{ color: GOLD, fontSize: 26 }}>✦</div>
      <div
        className="mt-3 uppercase"
        style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', color: GOLD }}
      >
        {QUIZ_TITLE}
      </div>
      <h1 className="mt-3" style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 34, color: TEXT }}>
        How well do you know <span style={{ color: PINK }}>Dolly</span>?
      </h1>
      <p className="mt-2" style={{ fontSize: 15, color: MUTED }}>
        8 questions · no timer · pure heart
      </p>
      <button
        type="button"
        data-testid="quiz-start-button"
        onClick={onStart}
        className="mt-6 min-h-[48px] cursor-pointer px-8 text-sm"
        style={GOLD_BUTTON}
      >
        Start the quiz →
      </button>
    </div>
  )
}

function QuestionCard({
  index,
  total,
  question,
  reveal,
  answering,
  submitting,
  isLast,
  onAnswer,
  onNext,
}: {
  index: number
  total: number
  question: (typeof CLIENT_QUESTIONS)[number]
  reveal: Reveal | null
  answering: boolean
  submitting: boolean
  isLast: boolean
  onAnswer: (optionIndex: number) => void
  onNext: () => void
}) {
  const pct = Math.round((index / total) * 100)
  const letters = ['A', 'B', 'C', 'D']

  return (
    <div
      data-testid="quiz-question-card"
      className="rounded-[18px] px-6 py-8"
      style={{ background: 'linear-gradient(170deg,#FBEAEE,#FFF9E8)' }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, letterSpacing: '0.14em', color: MUTED }} className="uppercase">
          Question {index + 1} of {total}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>{pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: BORDER }}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#E0AE4E,#C9922A)' }}
        />
      </div>

      <h2
        className="mt-5"
        style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 24, color: TEXT }}
        data-testid="quiz-question-prompt"
      >
        {question.prompt}
      </h2>

      <div className="mt-4 flex flex-col gap-2.5">
        {question.options.map((option, i) => {
          const answered = reveal !== null
          const isCorrectOption = answered && i === reveal.correctIndex
          const isWrongPick = answered && !reveal.correct && i === reveal.chosenIndex

          const optionStyle: CSSProperties = isCorrectOption
            ? { border: `1px solid ${GOLD}`, background: '#FFF9E8' }
            : isWrongPick
              ? { border: `1px solid ${PINK}`, background: '#FBEAEE' }
              : { border: `1px solid ${BORDER}`, background: 'rgba(253,246,240,0.7)' }

          return (
            <button
              key={question.id + i}
              type="button"
              data-testid={`quiz-option-${i}`}
              disabled={answered || answering}
              onClick={() => onAnswer(i)}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left disabled:cursor-default"
              style={optionStyle}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: '#FDF6F0', color: GOLD, fontWeight: 700, fontSize: 13 }}
              >
                {letters[i]}
              </span>
              <span className="flex-1" style={{ fontSize: 15, color: TEXT }}>
                {option}
              </span>
              {isCorrectOption && (
                <span style={{ fontSize: 12, fontWeight: 600, color: GOLD }}>✦ correct</span>
              )}
              {isWrongPick && <span style={{ fontSize: 12, fontWeight: 600, color: PINK }}>not quite</span>}
            </button>
          )
        })}
      </div>

      {reveal && (
        <div className="mt-4" data-testid="quiz-note">
          <p style={{ fontStyle: 'italic', fontSize: 14, color: MUTED }}>{reveal.note}</p>
          <button
            type="button"
            data-testid={isLast ? 'quiz-see-score-button' : 'quiz-next-button'}
            onClick={onNext}
            disabled={submitting}
            className="mt-4 min-h-[44px] cursor-pointer px-6 text-sm disabled:opacity-60"
            style={GOLD_BUTTON}
          >
            {submitting ? 'Grading…' : isLast ? 'See my score →' : 'Next question →'}
          </button>
        </div>
      )}
    </div>
  )
}

function ResultCard({
  result,
  onShare,
  onPlayAgain,
}: {
  result: QuizResult
  onShare: () => void
  onPlayAgain: () => void
}) {
  const { score, total } = result
  return (
    <div
      data-testid="quiz-result-card"
      className="rounded-[18px] px-8 py-10 text-center"
      style={{ background: 'linear-gradient(170deg,#FBEAEE,#FFF9E8)', border: `1px solid ${GOLD}` }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: GOLD }}>✦ Your score ✦</div>
      <div
        data-testid="quiz-result-score"
        className="mt-2"
        style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 68, color: PINK }}
      >
        {score}/{total}
      </div>
      <p className="mt-2" style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>
        {rankLine(score, total)}
      </p>
      <p className="mt-1" style={{ fontSize: 14, color: MUTED }}>
        {rankQuip(score, total)}
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          data-testid="quiz-share-button"
          onClick={onShare}
          className="min-h-[44px] w-full cursor-pointer px-6 text-sm sm:w-auto"
          style={GOLD_BUTTON}
        >
          Share my score ✦
        </button>
        <button
          type="button"
          data-testid="quiz-play-again-button"
          onClick={onPlayAgain}
          className="min-h-[44px] w-full cursor-pointer px-6 text-sm sm:w-auto"
          style={OUTLINE_GOLD_BUTTON}
        >
          Play again
        </button>
      </div>
    </div>
  )
}
