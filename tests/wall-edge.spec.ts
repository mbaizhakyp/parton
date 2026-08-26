/**
 * Tribute Wall (F1) edge cases and light stress — extends repro-b3.spec.ts's
 * coverage of the composer/card flow. See tests/repro-b3.spec.ts for the
 * base posting idiom and tests/helpers/wall.ts for the shared helpers this
 * file uses (postTribute, cardFor).
 *
 * Unique-per-run text everywhere: the local dev DB isn't reset between runs,
 * so a fixed string would collide with leftover rows and trip Playwright's
 * strict-mode checks.
 */
import { test, expect } from 'deepspace/testing'
import { postTribute, cardFor } from './helpers/wall'

function runId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

test('empty or whitespace-only body cannot be posted', async ({ users }) => {
  const [a] = await users(1)
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  await a.page
    .getByRole('button', { name: /leave a tribute|write the first tribute/i })
    .first()
    .click()
  const bodyField = a.page.getByPlaceholder(/what she means to you/i)
  await expect(bodyField).toBeVisible({ timeout: 10_000 })
  const postBtn = a.page.getByRole('button', { name: /post to the wall/i })

  // Nothing typed.
  await expect(postBtn).toBeDisabled()

  // Whitespace only — the composer trims before deciding, so this must stay
  // disabled too, not just a non-empty string check.
  await bodyField.fill('   ')
  await expect(postBtn).toBeDisabled()
})

test('500-char body posts fine; the composer maxLength stops a 501st character', async ({ users }) => {
  const [a] = await users(1)
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  const id = runId()
  const prefix = `[${id}] `
  const body500 = prefix + 'x'.repeat(500 - prefix.length) // exactly 500 chars

  await a.page
    .getByRole('button', { name: /leave a tribute|write the first tribute/i })
    .first()
    .click()
  const bodyField = a.page.getByPlaceholder(/what she means to you/i)
  await expect(bodyField).toBeVisible({ timeout: 10_000 })

  // Attempt to type 501 chars — the native maxlength attribute must cap the
  // DOM value at 500, not just cosmetically warn.
  await bodyField.fill(body500 + 'Y')
  await expect(bodyField).toHaveValue(body500)
  const value = await bodyField.inputValue()
  expect(value.length).toBe(500)

  await a.page.getByRole('button', { name: /post to the wall/i }).click()
  await expect(a.page.getByText(body500, { exact: true })).toBeVisible({ timeout: 10_000 })
})

test('a script/onerror body renders as literal text, not markup — no dialog fires', async ({ users }) => {
  const [a] = await users(1)
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  let dialogFired = false
  a.page.on('dialog', async (dialog) => {
    dialogFired = true
    await dialog.dismiss()
  })

  const id = runId()
  const payload = `<script>alert(1)</script><img src=x onerror=alert(2)> [${id}]`
  await postTribute(a.page, payload)

  // The literal string (tags and all) must be visible as text — proof React
  // rendered it as a text node, not dangerouslySetInnerHTML.
  await expect(a.page.getByText(payload, { exact: true })).toBeVisible()
  expect(dialogFired).toBe(false)
})

test('emoji and non-Latin unicode body round-trips intact after reload', async ({ users }) => {
  const [a] = await users(1)
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  const id = runId()
  const body = `🦋✦ Дорогая Долли, спасибо 你好 谢谢 [${id}]`
  await postTribute(a.page, body)

  await a.page.reload()
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
  await expect(a.page.getByText(body, { exact: true })).toBeVisible({ timeout: 10_000 })
})

test('"Place, Year" splits on the last comma; a no-comma value is place-only', async ({ users }) => {
  const [a] = await users(1)
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  const id = runId()
  const withYear = `Place/year probe with comma [${id}]`
  const noComma = `Place/year probe no comma [${id}]`

  await postTribute(a.page, withYear, 'Fort Worth, TX, 1995')
  await postTribute(a.page, noComma, 'Nashville')

  // Edit mode splits place/year back into their own inputs — the strongest
  // proof the parser split on the LAST comma (place keeps its internal ", TX").
  const cardWithYear = cardFor(a.page, withYear)
  await cardWithYear.getByRole('button', { name: 'Edit' }).click()
  await expect(cardWithYear.getByPlaceholder('Place (optional)')).toHaveValue('Fort Worth, TX')
  await expect(cardWithYear.getByPlaceholder('Year (optional)')).toHaveValue('1995')
  await cardWithYear.getByRole('button', { name: 'Cancel' }).click()

  const cardNoComma = cardFor(a.page, noComma)
  await cardNoComma.getByRole('button', { name: 'Edit' }).click()
  await expect(cardNoComma.getByPlaceholder('Place (optional)')).toHaveValue('Nashville')
  await expect(cardNoComma.getByPlaceholder('Year (optional)')).toHaveValue('')
})

test('rapid double-click on "Post to the Wall" produces exactly one tribute', async ({ users }) => {
  const [a] = await users(1)
  await a.page.goto('/home')
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  const id = runId()
  const text = `Double-click race probe [${id}]`

  await a.page
    .getByRole('button', { name: /leave a tribute|write the first tribute/i })
    .first()
    .click()
  const bodyField = a.page.getByPlaceholder(/what she means to you/i)
  await expect(bodyField).toBeVisible({ timeout: 10_000 })
  await bodyField.fill(text)

  const postBtn = a.page.getByRole('button', { name: /post to the wall/i })
  // Two native clicks dispatched back-to-back in the same tick — a truer
  // double-click race than two serialized Playwright .click() calls, which
  // would each wait out the button's disabled state in between.
  await postBtn.evaluate((el) => {
    ;(el as HTMLButtonElement).click()
    ;(el as HTMLButtonElement).click()
  })

  await expect(a.page.getByText(text, { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect
    .poll(() => a.page.getByText(text, { exact: true }).count(), { timeout: 8_000 })
    .toBe(1)
})

test('editing own tribute persists after reload; deleting it disappears live for a second signed-in user', async ({
  users,
}) => {
  const [a, b] = await users(2)
  await Promise.all([a.page.goto('/home'), b.page.goto('/home')])
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
  await expect(b.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  const id = runId()
  const original = `Original memory [${id}]`
  const edited = `Edited memory [${id}]`

  await postTribute(a.page, original)
  await expect(b.page.getByText(original)).toBeVisible({ timeout: 15_000 })

  // cardFor() re-resolves its "getByText(original)" chain lazily on every
  // call — fine up through the Edit click, but editing mode swaps that <p>
  // for a <textarea> (the body text stops existing as a text node at all),
  // so the same locator would go stale mid-edit. Card-scoped for the Edit
  // click; page-scoped once inside edit mode, where the composer modal is
  // closed and this is the only textarea/Save button on the page.
  const card = cardFor(a.page, original)
  await card.getByRole('button', { name: 'Edit' }).click()
  const editTextarea = a.page.locator('textarea')
  await expect(editTextarea).toBeVisible({ timeout: 5_000 })
  await editTextarea.fill(edited)
  await a.page.getByRole('button', { name: 'Save' }).click()
  await expect(a.page.getByText(edited, { exact: true })).toBeVisible({ timeout: 10_000 })

  // Persists after reload for the author.
  await a.page.reload()
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
  await expect(a.page.getByText(edited, { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(a.page.getByText(original)).toHaveCount(0)

  // The second, already-open context sees the edit live (no reload).
  await expect(b.page.getByText(edited)).toBeVisible({ timeout: 15_000 })
  await expect(b.page.getByText(original)).toHaveCount(0)

  // Delete — the second context (still no reload) sees it vanish live.
  const cardToDelete = cardFor(a.page, edited)
  await cardToDelete.getByRole('button', { name: 'Delete' }).click()
  const confirmDialog = a.page.getByRole('dialog', { name: 'Delete this tribute?' })
  await confirmDialog.getByRole('button', { name: 'Delete' }).click()

  await expect(a.page.getByText(edited)).toHaveCount(0, { timeout: 10_000 })
  await expect(b.page.getByText(edited)).toHaveCount(0, { timeout: 10_000 })
})

test('posting 15 tributes propagates to a second context in order; a sparkle burst converges', async ({
  users,
}) => {
  test.setTimeout(90_000)
  const [a, b] = await users(2)
  await Promise.all([a.page.goto('/home'), b.page.goto('/home')])
  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
  await expect(b.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  const id = runId()
  const texts: string[] = []
  for (let i = 0; i < 15; i++) {
    const text = `Stress memory #${i} [${id}]`
    texts.push(text)
    await postTribute(a.page, text)
  }

  // Second, already-open context ends up seeing all 15 without a reload.
  for (const text of texts) {
    await expect(b.page.getByText(text, { exact: true })).toBeVisible({ timeout: 15_000 })
  }

  // Newest-first among these unpinned cards: the body <p> nodes for this
  // run's marker should read in DOM order from #14 down to #0.
  const bodyNodes = a.page.locator('p', { hasText: `[${id}]` })
  await expect(bodyNodes).toHaveCount(15, { timeout: 15_000 })
  const domOrder = await bodyNodes.allTextContents()
  expect(domOrder).toEqual([...texts].reverse())

  // Sparkle burst on one card — 5 rapid clicks, read from both contexts.
  const target = texts[0]
  const sparkleA = cardFor(a.page, target).getByRole('button', { name: /✦/ })
  const sparkleB = cardFor(b.page, target).getByRole('button', { name: /✦/ })

  async function readCount(locator: typeof sparkleA): Promise<number> {
    const text = await locator.innerText()
    return Number(text.replace(/[^\d]/g, ''))
  }

  await sparkleA.evaluate((el) => {
    for (let i = 0; i < 5; i++) (el as HTMLButtonElement).click()
  })

  // Ceiling is convergence, not exactness — addSparkle is a documented
  // read-then-write race (src/actions/index.ts), so 5 rapid clicks can land
  // anywhere from 1..5. Both contexts must agree once the dust settles.
  await expect
    .poll(
      async () => {
        const [ca, cb] = await Promise.all([readCount(sparkleA), readCount(sparkleB)])
        return ca === cb ? ca : -1
      },
      { timeout: 15_000, intervals: [500] },
    )
    .toBeGreaterThan(0)

  const final = await readCount(sparkleA)
  expect(final).toBeGreaterThanOrEqual(1)
  expect(final).toBeLessThanOrEqual(5)
  expect(await readCount(sparkleB)).toBe(final)
})
