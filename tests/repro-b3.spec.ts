/**
 * B3 repro — posting twice should yield two tribute cards, not an update
 * of the first. Throwaway diagnostic spec.
 *
 * Posting goes through the composer modal (opened by the "Leave a tribute"
 * CTA — or "Write the first tribute" on an empty wall), a single "Place,
 * Year" field plus a body textarea, submitted with "Post to the Wall".
 */
import { test, expect } from 'deepspace/testing'

test('two posts create two tributes', async ({ users }) => {
  const [a] = await users(1)
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  // Unique per run: the local dev DB isn't reset between test runs, so a
  // fixed string would collide with leftover rows from a previous run and
  // trip Playwright's strict-mode "resolved to N elements" check.
  const runId = Date.now().toString(36)
  const firstText = `First memory — saw her live in Nashville. [${runId}]`
  const secondText = `Second memory — Jolene on repeat all summer. [${runId}]`

  async function postTribute(text: string) {
    await a.page
      .getByRole('button', { name: /leave a tribute|write the first tribute/i })
      .first()
      .click()
    const body = a.page.getByPlaceholder(/what she means to you/i)
    await expect(body).toBeVisible({ timeout: 10_000 })
    await body.fill(text)
    await a.page.getByRole('button', { name: /post to the wall/i }).click()
    await expect(a.page.getByText(text)).toBeVisible({ timeout: 10_000 })
  }

  await postTribute(firstText)
  await postTribute(secondText)

  // The bug: first card gets replaced. Both must be present.
  await expect(a.page.getByText(firstText)).toBeVisible()
})
