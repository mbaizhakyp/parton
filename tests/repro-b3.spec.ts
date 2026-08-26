/**
 * B3 repro — posting twice should yield two tribute cards, not an update
 * of the first. Throwaway diagnostic spec.
 */
import { test, expect } from 'deepspace/testing'

test('two posts create two tributes', async ({ users }) => {
  const [a] = await users(1)
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  const body = a.page.getByPlaceholder(/memory|tribute|share/i).first()
  await expect(body).toBeVisible({ timeout: 10_000 })

  await body.fill('First memory — saw her live in Nashville.')
  await a.page.getByRole('button', { name: /post|share|submit/i }).first().click()
  await expect(a.page.getByText('First memory — saw her live in Nashville.')).toBeVisible({ timeout: 10_000 })

  await body.fill('Second memory — Jolene on repeat all summer.')
  await a.page.getByRole('button', { name: /post|share|submit/i }).first().click()
  await expect(a.page.getByText('Second memory — Jolene on repeat all summer.')).toBeVisible({ timeout: 10_000 })

  // The bug: first card gets replaced. Both must be present.
  await expect(a.page.getByText('First memory — saw her live in Nashville.')).toBeVisible()
})
