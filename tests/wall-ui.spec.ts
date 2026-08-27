/**
 * Wall UI — tribute body clamp/expand (round 3, Task 1) and the header's
 * fan-count pill sourced from `stats` (round 3, Task 2). See
 * tests/wall-edge.spec.ts for the shared composer idiom and
 * tests/helpers/wall.ts for postTribute/cardFor.
 */
import { test, expect } from 'deepspace/testing'
import { cardFor } from './helpers/wall'

function runId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

test('a long unbroken body clamps with a "More" button that expands to "Show less"', async ({ users }) => {
  const [a] = await users(1)
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  const id = runId()
  const prefix = `[${id}] `
  // 600 unbroken chars — the composer's maxLength (500) still caps what
  // actually posts, same as wall-edge's 500-char test; either side of that
  // cap is well past the wall's own 280-char clamp threshold.
  const attempted = prefix + 'x'.repeat(600 - prefix.length)
  const posted = attempted.slice(0, 500)

  await a.page
    .getByRole('button', { name: /leave a tribute|write the first tribute/i })
    .first()
    .click()
  const bodyField = a.page.getByPlaceholder(/what she means to you/i)
  await expect(bodyField).toBeVisible({ timeout: 10_000 })
  await bodyField.fill(attempted)
  await expect(bodyField).toHaveValue(posted)
  await a.page.getByRole('button', { name: /post to the wall/i }).click()
  await expect(a.page.getByText(posted, { exact: true })).toBeVisible({ timeout: 10_000 })

  const card = cardFor(a.page, posted)
  const moreButton = card.getByRole('button', { name: 'More' })
  await expect(moreButton).toBeVisible({ timeout: 10_000 })

  await moreButton.click()
  await expect(card.getByRole('button', { name: 'Show less' })).toBeVisible({ timeout: 5_000 })
  // Full text was there all along (CSS clamp, not a truncated DOM string) —
  // still visible now that the clamp class is gone.
  await expect(a.page.getByText(posted, { exact: true })).toBeVisible()
})

test('header fans pill is sourced from stats after sign-in and reload', async ({ users }) => {
  const [a] = await users(1)
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  // ensureAdmin (which refreshes stats.fans) is poked fire-and-forget on
  // mount — reload once so this session's own sign-in has landed, then give
  // the fresh WS connection room to sync the `stats` subscription before
  // checking (a tight reload loop leaves no time for that sync to land).
  await a.page.reload()
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  const pill = a.page.getByText(/\d+ fans? remembering/)
  await expect(pill).toBeVisible({ timeout: 15_000 })
})
