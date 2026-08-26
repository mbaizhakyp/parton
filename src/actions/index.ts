import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { QUIZ_QUESTIONS } from '../server/quiz-data'

interface TributeRecord {
  sparkles?: number
}

interface ScoreRecord extends Record<string, unknown> {
  playerName: string
  score: number
  total: number
  takenAt: string
}

interface UserRecord extends Record<string, unknown> {
  name?: string
  email?: string
}

interface QuizAnswer {
  questionId: string
  chosenIndex: number
}

export const actions: Record<string, ActionHandler<Env>> = {
  /**
   * Increments a tribute's sparkle count. A server action (not a plain
   * `put`) because any signed-in member may sparkle *any* tribute, while the
   * tributes schema only grants `update: 'own'` to members.
   */
  addSparkle: async ({ params, tools }) => {
    const tributeId = params.tributeId
    if (typeof tributeId !== 'string' || !tributeId) {
      return { success: false, error: 'Missing tributeId' }
    }

    const existing = await tools.get('tributes', tributeId)
    if (!existing.success) return existing

    const { record } = existing.data as { record: { data: TributeRecord } }
    const current = record.data.sparkles ?? 0

    // ponytail: read-then-write, not an atomic increment — this SDK has no
    // atomic increment primitive. Two sparkles landing in the same instant
    // can clobber one another and undercount by one. Accepted ceiling for a
    // fan-tribute counter; upgrade to a DO-side atomic op if one ships.
    return tools.update('tributes', tributeId, { sparkles: current + 1 })
  },

  /**
   * Grades one question against the server-only answer key (QUIZ_QUESTIONS
   * never ships to the client) and reveals the fact note for it. Powers the
   * design's per-question reveal (correct/not-quite mark + note) before the
   * player moves on.
   *
   * ponytail: a signed-in caller can hit this repeatedly across replays and
   * eventually learn every correctIndex/note by brute force — there's no
   * rate limit or per-question attempt cap. Accepted ceiling for a fan quiz
   * with no real stakes; add a per-user attempt counter if this ever needs
   * to resist cheating.
   */
  answerQuestion: async ({ params }) => {
    const questionId = params.questionId
    const chosenIndex = params.chosenIndex
    if (typeof questionId !== 'string' || typeof chosenIndex !== 'number') {
      return { success: false, error: 'Missing questionId or chosenIndex' }
    }
    const question = QUIZ_QUESTIONS.find((q) => q.id === questionId)
    if (!question) return { success: false, error: 'Unknown question' }

    return {
      success: true,
      data: {
        correct: chosenIndex === question.correctIndex,
        correctIndex: question.correctIndex,
        note: question.note,
      },
    }
  },

  /**
   * Grades the whole quiz server-side against QUIZ_QUESTIONS — any
   * client-claimed score is ignored, only { questionId, chosenIndex } pairs
   * are trusted — then upserts the caller's leaderboard row.
   *
   * Upsert pattern: `tools.create('scores', data, userId)` keyed by the
   * caller's userId (the "seeding" pattern from the server-actions guide),
   * read-before-write so a worse replay never overwrites a better score.
   */
  submitQuiz: async ({ userId, params, tools }) => {
    const answers = params.answers
    if (!Array.isArray(answers)) {
      return { success: false, error: 'Missing answers' }
    }

    const byQuestionId = new Map<string, number>()
    for (const a of answers as QuizAnswer[]) {
      if (a && typeof a.questionId === 'string' && typeof a.chosenIndex === 'number') {
        byQuestionId.set(a.questionId, a.chosenIndex)
      }
    }

    const total = QUIZ_QUESTIONS.length
    const score = QUIZ_QUESTIONS.reduce(
      (sum, q) => sum + (byQuestionId.get(q.id) === q.correctIndex ? 1 : 0),
      0,
    )

    const userRes = await tools.get<UserRecord>('users', userId)
    // Name only — never the email: the leaderboard is public ('*' read),
    // so an email fallback would publish addresses.
    const playerName = (userRes.success && userRes.data.record.data.name) || 'A Dolly Fan'

    const existing = await tools.get<ScoreRecord>('scores', userId)
    const best = existing.success ? existing.data.record.data : null

    const keepBest = best && best.score > score
    const finalScore = keepBest ? best.score : score
    const finalTakenAt = keepBest ? best.takenAt : new Date().toISOString()

    const upsert = await tools.create(
      'scores',
      { playerName, score: finalScore, total, takenAt: finalTakenAt },
      userId,
    )
    if (!upsert.success) return upsert

    return { success: true, data: { score, total, best: finalScore } }
  },
}
