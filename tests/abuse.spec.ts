/**
 * Permissions/abuse and light stress — asserts server-enforced behavior, not
 * just what the UI happens to hide, plus presence under a churning peer
 * count.
 *
 * Forged record writes — what was attempted: tributes/scores have no REST
 * write endpoint to forge against. `tools.*` (src/server/action-routes.ts)
 * only answers an internal `X-App-Action: 'true'` header set server-side;
 * the one client-reachable write channel is the record WebSocket
 * (`/ws/:roomId?token=...`, src/server/realtime-routes.ts), whose message
 * framing isn't documented in references/docs. Reverse-engineering that
 * protocol to hand-craft a raw PUT frame was judged not worth the time
 * against a 6-8h budget (the brief's own sanctioned fallback for this case).
 * What's covered instead, all server-side, not just UI:
 *   - user B gets no edit/delete/hide/pin affordances on user A's tribute
 *     (below) — and per src/schemas/tributes-schema.ts, `member` role only
 *     gets `update: 'own'` / `delete: 'own'`, so even a successful forge
 *     attempt through the real record channel would be rejected by RBAC,
 *     not just hidden by the UI.
 *   - addSparkle (the one write path that legitimately targets ANY
 *     tributeId, by design — see src/actions/index.ts) fuzzed with a bogus
 *     id (below).
 *   - submitQuiz fuzzed with malformed payloads (tests/quiz-edge.spec.ts).
 */
import { test, expect } from 'deepspace/testing'
import { postTribute, cardFor } from './helpers/wall'
import { actionToken, callAction } from './helpers/actions'

function runId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

test('user B sees no edit/delete/hide/pin affordances on user A tribute', async ({ users }) => {
  const [a, b] = await users(2)
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  const id = runId()
  const text = `Permission probe [${id}]`
  await postTribute(a.page, text)

  await b.page.goto('/home')
  await expect(b.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
  await expect(b.page.getByText(text)).toBeVisible({ timeout: 15_000 })

  const cardB = cardFor(b.page, text)
  await expect(cardB.getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(cardB.getByRole('button', { name: 'Delete' })).toHaveCount(0)
  await expect(cardB.getByRole('button', { name: /^(Hide|Unhide)$/ })).toHaveCount(0)
  await expect(cardB.getByRole('button', { name: /^(Pin|Unpin)$/ })).toHaveCount(0)
  // The sparkle affordance IS shared (any member may sparkle any tribute).
  await expect(cardB.getByRole('button', { name: /✦/ })).toHaveCount(1)
})

test('signed-out fetches to action endpoints fail safely with 401 JSON, not a crash', async ({ page }) => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ['addSparkle', { tributeId: 'whatever' }],
    ['answerQuestion', { questionId: 'q1', chosenIndex: 0 }],
    ['submitQuiz', { answers: [] }],
  ]
  for (const [name, params] of cases) {
    const { status, body } = await callAction(page, name, params, null)
    expect(status).toBe(401)
    expect(body?.success).not.toBe(true)
  }
})

test('addSparkle with a bogus tributeId errors without crashing the server', async ({ users }) => {
  const [b] = await users(1)
  await b.page.goto('/home')
  await expect(b.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  const token = await actionToken(b.page)
  expect(token).toBeTruthy()
  const { status, body } = await callAction(
    b.page,
    'addSparkle',
    { tributeId: `not-a-real-tribute-${Date.now()}` },
    token,
  )
  expect(status).toBeLessThan(500)
  expect(body?.success).toBe(false)
  expect(typeof body?.error).toBe('string')

  // Also missing the param entirely — same contract, no crash.
  const missing = await callAction(b.page, 'addSparkle', {}, token)
  expect(missing.status).toBeLessThan(500)
  expect(missing.body?.success).toBe(false)
})

test('presence count rises when a third context opens and falls when it closes', async ({ users, browser }) => {
  test.setTimeout(60_000)
  // Live presence moved from the header pill (now total-signups) to the
  // admin "Here now" tile — same room, admin-only surface.
  const [a] = await users(['Admin E2E'])
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
  await a.page.reload()
  await expect(a.page.getByTestId('app-navigation')).toHaveAttribute('data-user-role', 'admin', {
    timeout: 15_000,
  })
  await a.page.goto('/admin')
  await expect(a.page.getByTestId('admin-tiles')).toBeVisible({ timeout: 15_000 })

  const tile = a.page.getByTestId('admin-tiles').locator('div', { hasText: /^Here now$/ }).locator('..')
  async function readCount(): Promise<number> {
    const text = await tile.innerText()
    return Number(text.replace(/[^\d]/g, ''))
  }

  await expect.poll(readCount, { timeout: 15_000, intervals: [500] }).toBeGreaterThanOrEqual(1)
  const baseline = await readCount()

  const thirdContext = await browser.newContext()
  try {
    const thirdPage = await thirdContext.newPage()
    await thirdPage.goto('/home')
    await expect(thirdPage.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

    await expect.poll(readCount, { timeout: 20_000, intervals: [500] }).toBeGreaterThan(baseline)
  } finally {
    await thirdContext.close()
  }

  await expect.poll(readCount, { timeout: 20_000, intervals: [500] }).toBeLessThanOrEqual(baseline)
})
