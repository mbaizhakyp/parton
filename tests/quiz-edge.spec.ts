/**
 * Quiz (F2) action fuzzing — direct fetches to /api/actions/answerQuestion
 * and /api/actions/submitQuiz from a signed-in page's own authenticated
 * channel, bypassing the UI entirely. See tests/helpers/actions.ts:
 * `actionToken` reproduces the SDK's `getAuthToken()` (POST /api/auth/token
 * with the session cookie) since that function lives inside the app's
 * client bundle, not anything importable from Node.
 *
 * Importing QUIZ_QUESTIONS (server-only answer key) is safe here for the
 * same reason tests/quiz.spec.ts does it: Playwright specs run in Node,
 * never bundled to the browser.
 */
import { test, expect } from 'deepspace/testing'
import { QUIZ_QUESTIONS } from '../src/server/quiz-data'
import { actionToken, callAction } from './helpers/actions'

const TOTAL = QUIZ_QUESTIONS.length

test('answerQuestion rejects malformed input without a 500', async ({ users }) => {
  const [u] = await users(1)
  await u.page.goto('/quiz')
  await expect(u.page.getByTestId('quiz-intro')).toBeVisible({ timeout: 15_000 })
  const token = await actionToken(u.page)
  expect(token).toBeTruthy()

  // Unknown questionId -> explicit error.
  const unknown = await callAction(u.page, 'answerQuestion', { questionId: 'not-a-real-q', chosenIndex: 0 }, token)
  expect(unknown.status).toBeLessThan(500)
  expect(unknown.body?.success).toBe(false)
  expect(typeof unknown.body?.error).toBe('string')

  // chosenIndex "2" as a STRING fails the type check -> explicit error.
  const stringIndex = await callAction(
    u.page,
    'answerQuestion',
    { questionId: QUIZ_QUESTIONS[0].id, chosenIndex: '2' },
    token,
  )
  expect(stringIndex.status).toBeLessThan(500)
  expect(stringIndex.body?.success).toBe(false)
  expect(typeof stringIndex.body?.error).toBe('string')

  // Missing questionId / missing chosenIndex -> explicit error either way.
  const missingQuestionId = await callAction(u.page, 'answerQuestion', { chosenIndex: 0 }, token)
  expect(missingQuestionId.status).toBeLessThan(500)
  expect(missingQuestionId.body?.success).toBe(false)

  const missingChosenIndex = await callAction(
    u.page,
    'answerQuestion',
    { questionId: QUIZ_QUESTIONS[0].id },
    token,
  )
  expect(missingChosenIndex.status).toBeLessThan(500)
  expect(missingChosenIndex.body?.success).toBe(false)

  // chosenIndex 99 on a REAL question: it IS a number, so it passes the
  // handler's only guard (typeof check) and is graded as simply wrong — no
  // crash, but NOT success:false. Found gap, not a crash: answerQuestion
  // never bounds-checks chosenIndex against the 4 real options, so any
  // out-of-range number is silently treated as "not the correct answer"
  // instead of being rejected as invalid input. See src/actions/index.ts.
  const outOfRange = await callAction(
    u.page,
    'answerQuestion',
    { questionId: QUIZ_QUESTIONS[0].id, chosenIndex: 99 },
    token,
  )
  expect(outOfRange.status).toBeLessThan(500)
  expect(outOfRange.body?.success).toBe(true)
  const data = outOfRange.body?.data as { correct: boolean; correctIndex: number }
  expect(data.correct).toBe(false)
  expect(data.correctIndex).toBe(QUIZ_QUESTIONS[0].correctIndex)
})

test('submitQuiz handles malformed and adversarial payloads without a 500, and the leaderboard stays sane', async ({
  users,
}) => {
  const [u] = await users(1)
  await u.page.goto('/quiz')
  await expect(u.page.getByTestId('quiz-intro')).toBeVisible({ timeout: 15_000 })
  const token = await actionToken(u.page)
  expect(token).toBeTruthy()

  // `answers` not an array, in a few shapes.
  for (const badAnswers of ['nope', 42, { foo: 'bar' }, null]) {
    const res = await callAction(u.page, 'submitQuiz', { answers: badAnswers }, token)
    expect(res.status).toBeLessThan(500)
    expect(res.body?.success).toBe(false)
    expect(typeof res.body?.error).toBe('string')
  }

  // Empty array -> this attempt scores 0 (server-graded, not client-claimed).
  const empty = await callAction(u.page, 'submitQuiz', { answers: [] }, token)
  expect(empty.status).toBeLessThan(500)
  expect(empty.body?.success).toBe(true)
  const emptyData = empty.body?.data as { score: number; total: number; best: number }
  expect(emptyData.score).toBe(0)
  expect(emptyData.total).toBe(TOTAL)
  expect(emptyData.best).toBeGreaterThanOrEqual(0)
  expect(emptyData.best).toBeLessThanOrEqual(TOTAL)

  // Duplicate questionIds (last one wins) + bogus extra ids (ignored, since
  // grading iterates QUIZ_QUESTIONS and looks answers up by id — an id not
  // in that list is never consulted).
  const answers = [
    { questionId: QUIZ_QUESTIONS[0].id, chosenIndex: (QUIZ_QUESTIONS[0].correctIndex + 1) % 4 }, // wrong
    { questionId: QUIZ_QUESTIONS[0].id, chosenIndex: QUIZ_QUESTIONS[0].correctIndex }, // duplicate, correct: wins
    { questionId: QUIZ_QUESTIONS[1].id, chosenIndex: QUIZ_QUESTIONS[1].correctIndex }, // correct
    { questionId: 'bogus-question-id-does-not-exist', chosenIndex: 0 }, // ignored
    { questionId: 'another-bogus-id-missing-chosenIndex' }, // malformed extra, ignored
  ]
  const dup = await callAction(u.page, 'submitQuiz', { answers }, token)
  expect(dup.status).toBeLessThan(500)
  expect(dup.body?.success).toBe(true)
  const dupData = dup.body?.data as { score: number; total: number; best: number }
  expect(dupData.total).toBe(TOTAL)
  expect(dupData.score).toBe(2) // q0 (last-wins correct) + q1 (correct); rest unanswered
  expect(dupData.score).toBeLessThanOrEqual(dupData.total)
  expect(dupData.best).toBeGreaterThanOrEqual(dupData.score)
  expect(dupData.best).toBeLessThanOrEqual(TOTAL)

  // Leaderboard row for the fuzzing user, if it ranks in the visible top 8
  // (Leaderboard.tsx slices to 8) — still a sane 0..TOTAL score either way.
  // The server-graded `best` above is the authoritative "sane score" check
  // regardless of whether this account's row is currently in the top 8.
  await u.page.reload()
  await expect(u.page.getByTestId('quiz-leaderboard')).toBeVisible({ timeout: 15_000 })
  const row = u.page.getByTestId('leaderboard-row').filter({ hasText: u.name })
  if ((await row.count()) > 0) {
    const scoreText = await row.getByTestId('leaderboard-score').innerText()
    const scoreValue = Number(scoreText)
    expect(scoreValue).toBeGreaterThanOrEqual(0)
    expect(scoreValue).toBeLessThanOrEqual(TOTAL)
  }
})
