import type { Page } from '@playwright/test'
import { expect } from 'deepspace/testing'

/**
 * Opens the composer, fills body (+ optional "Place, Year" field), submits,
 * and waits for the posted body to render on the wall. Mirrors the composer
 * idiom in repro-b3.spec.ts.
 */
export async function postTribute(page: Page, body: string, placeYear = ''): Promise<void> {
  await page
    .getByRole('button', { name: /leave a tribute|write the first tribute/i })
    .first()
    .click()
  if (placeYear) {
    await page.getByPlaceholder(/e\.g\. knoxville, 2003/i).fill(placeYear)
  }
  const bodyField = page.getByPlaceholder(/what she means to you/i)
  await expect(bodyField).toBeVisible({ timeout: 10_000 })
  await bodyField.fill(body)
  await page.getByRole('button', { name: /post to the wall/i }).click()
  await expect(page.getByText(body, { exact: true })).toBeVisible({ timeout: 10_000 })
}

/**
 * Locates a TributeCard's outer container by the unique body text it
 * renders — there's no data-testid per card, so this walks up from the body
 * <p> to the nearest ancestor carrying the card's `rounded-2xl` class. Scope
 * Edit/Delete/Hide/Pin/Sparkle lookups through the returned locator so they
 * only see the ONE card, not every affordance on the wall.
 */
export function cardFor(page: Page, text: string) {
  return page
    .getByText(text, { exact: false })
    .locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]')
}
