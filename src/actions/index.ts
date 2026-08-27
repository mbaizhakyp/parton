import type { ActionHandler, JwtClaims } from 'deepspace/worker'
import type { Env } from '../../worker'
import { QUIZ_QUESTIONS } from '../server/quiz-data'
import { SEED_TRIBUTES } from '../server/seed-tributes'

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

/**
 * Emails auto-promoted to admin on sign-in (see ensureAdmin below).
 * admin.e2e@deepspace.test exists only so the Playwright suite can exercise
 * the admin page — deepspace.test accounts are mintable solely via the app
 * owner's CLI, so this grants nothing to the public.
 */
const ADMIN_EMAILS = ['mbaizhakyp@gmail.com', 'admin.e2e@deepspace.test']

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

  /**
   * Idempotent bootstrap, poked once per signed-in session from the app
   * shell. The email comes from the caller's JWT (already verified by the
   * action route) rather than the users row — the row may not be seeded yet
   * on the very first load, and an explicit-id create is merge-on-existing,
   * so this both promotes and (if needed) seeds in one write.
   *
   * Every signed-in caller registers now (not just ADMIN_EMAILS) — that's
   * what completes the admin signups table for ordinary fans — while
   * isAdmin is still derived only from the verified JWT's email, never from
   * client input.
   */
  ensureAdmin: async ({ userId, callerJwt, tools }) => {
    // Payload-only decode: the action route already verified this JWT's
    // signature before the handler ran, so reading claims is safe here.
    let claims: JwtClaims | null = null
    try {
      claims = JSON.parse(atob(callerJwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    } catch {
      claims = null
    }
    const email = typeof claims?.email === 'string' ? claims.email : undefined
    if (!email) {
      // Some JWTs may lack an email — nothing to register against.
      return { success: true, data: { role: null } }
    }

    // `role` is system-managed — registerUser is the sanctioned path.
    const reg = await tools.registerUser({
      userId,
      email,
      name: typeof claims?.name === 'string' ? claims.name : undefined,
      isAdmin: ADMIN_EMAILS.includes(email),
    })
    if (!reg.success) return reg

    // Best-effort refresh of the header's fan count. Never let a stats
    // write failure break sign-in over a cosmetic counter.
    try {
      const list = await tools.query('users', { limit: 10000 })
      if (list.success) {
        await tools.create('stats', { fans: list.data.count }, 'site')
      }
    } catch {
      // ignored — see comment above
    }

    if (reg.data.user.role === 'admin') {
      await seedWallOnce(tools, userId)
    }

    return { success: true, data: { role: reg.data.user.role } }
  },
}

/**
 * One-shot wall curation, run on the owner's first admin sign-in after
 * deploy: replaces the pre-launch test posts with the curated starter cards
 * from src/server/seed-tributes.ts. Idempotent — the explicit seed-01 id
 * doubles as the "already seeded" flag, so later sign-ins are a single read.
 * Best-effort: a failure here must never break sign-in.
 */
async function seedWallOnce(
  tools: Parameters<ActionHandler<Env>>[0]['tools'],
  userId: string,
) {
  try {
    const flag = await tools.get('tributes', 'seed-01')
    if (flag.success) return

    const all = await tools.query('tributes', { limit: 10000 })
    if (all.success) {
      for (const r of all.data.records) await tools.remove('tributes', r.recordId)
    }
    // Reverse order so seed-01 — the "seeded" flag checked above — is
    // written last: a half-run leaves the flag absent and the next admin
    // sign-in retries (creates are merge-on-existing, so re-runs are safe).
    for (const [i, t] of [...SEED_TRIBUTES.entries()].reverse()) {
      await tools.create(
        'tributes',
        {
          authorId: userId,
          authorName: 'Forever Dolly',
          body: t.body,
          place: t.place,
          year: t.year,
          pinned: t.pinned ?? false,
        },
        `seed-${String(i + 1).padStart(2, '0')}`,
      )
    }
  } catch {
    // Best-effort: sign-in must never break over launch curation. A failed
    // run leaves seed-01 absent, so the next admin sign-in retries.
  }
}
