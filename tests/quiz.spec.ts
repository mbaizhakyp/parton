/**
 * Quiz spec (F2) — completes the trivia quiz, asserts the server-computed
 * score (not anything the client could have forged), checks the score lands
 * on the live leaderboard, then replays with a worse score and asserts the
 * leaderboard keeps the better one (the submitQuiz upsert's "keep best"
 * rule).
 *
 * Importing QUIZ_QUESTIONS here is safe: Playwright specs run in Node, never
 * bundled to the browser, so this doesn't leak the answer key to a client —
 * it's the same trust boundary the `answerQuestion`/`submitQuiz` actions
 * enforce for the real app.
 */
import { test, expect } from 'deepspace/testing'
import type { Page } from '@playwright/test'
import { QUIZ_QUESTIONS } from '../src/server/quiz-data'

const TOTAL = QUIZ_QUESTIONS.length

/** Plays the full quiz from the intro screen, picking one option per
 *  question via `pickIndex(correctIndex, questionIndex)`, and stops once the
 *  result card renders. */
async function playQuiz(page: Page, pickIndex: (correctIndex: number, i: number) => number) {
  await page.getByTestId('quiz-start-button').click()

  for (let i = 0; i < TOTAL; i++) {
    const correctIndex = QUIZ_QUESTIONS[i].correctIndex
    const chosen = pickIndex(correctIndex, i)

    await expect(page.getByTestId('quiz-question-card')).toBeVisible()
    await page.getByTestId(`quiz-option-${chosen}`).click()
    await expect(page.getByTestId('quiz-note')).toBeVisible()

    const isLast = i === TOTAL - 1
    await page.getByTestId(isLast ? 'quiz-see-score-button' : 'quiz-next-button').click()
  }

  await expect(page.getByTestId('quiz-result-card')).toBeVisible()
}

test('quiz grades server-side, posts to the leaderboard, and keeps the best score', async ({
  users,
}) => {
  const [alice] = await users(1)
  await alice.page.goto('/quiz')
  await expect(alice.page.getByTestId('quiz-intro')).toBeVisible({ timeout: 15_000 })

  // Attempt 1 — answer q1 correctly (asserted below via the ✦ correct mark)
  // and every question correctly, so the server-graded score is deterministic:
  // a perfect TOTAL/TOTAL. Picking `correctIndex` for every question means we
  // know exactly what submitQuiz must return without trusting the client.
  await playQuiz(alice.page, (correctIndex) => correctIndex)
  await expect(alice.page.getByTestId('quiz-result-score')).toHaveText(`${TOTAL}/${TOTAL}`)

  // The leaderboard is realtime (useQuery's WebSocket subscription) — no
  // reload needed for alice's own submission to appear.
  const myRow = alice.page.getByTestId('leaderboard-row').filter({ hasText: alice.name })
  await expect(myRow).toBeVisible({ timeout: 15_000 })
  await expect(myRow.getByTestId('leaderboard-score')).toHaveText(String(TOTAL))

  // Attempt 2 — deliberately wrong on every question ((correctIndex + 1) % 4
  // is never the correct option), so this replay's true score is 0. The
  // leaderboard row must NOT drop to 0 — submitQuiz reads the existing row
  // first and only overwrites when the new score is higher.
  await alice.page.getByTestId('quiz-play-again-button').click()
  await expect(alice.page.getByTestId('quiz-intro')).toBeVisible()
  await playQuiz(alice.page, (correctIndex) => (correctIndex + 1) % 4)
  await expect(alice.page.getByTestId('quiz-result-score')).toHaveText(`0/${TOTAL}`)

  // Give a worse-score write a moment to (not) land, then assert the
  // leaderboard still shows the earlier, better score.
  await alice.page.waitForTimeout(1000)
  await expect(myRow.getByTestId('leaderboard-score')).toHaveText(String(TOTAL))
})

test('signed-out visitor sees the leaderboard read-only and starting the quiz prompts sign-in', async ({
  page,
}) => {
  await page.goto('/quiz')
  await expect(page.getByTestId('quiz-leaderboard')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('quiz-intro')).toBeVisible()

  await page.getByTestId('quiz-start-button').click()
  await expect(page.getByTestId('auth-overlay')).toBeVisible({ timeout: 15_000 })
})
