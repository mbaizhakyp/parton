/**
 * Admin dashboard + error log.
 *
 * The admin.e2e@deepspace.test account is auto-promoted by the ensureAdmin
 * action (ADMIN_EMAILS) on its first signed-in page load; other accounts stay
 * members. Specs assert the role gate, moderation with delete, and the
 * client-error log's capture + review flow.
 */
import { test, expect } from 'deepspace/testing'
import { cardFor } from './helpers/wall'

test('non-admin sees no admin nav entry and no admin content', async ({ users }) => {
  const [member] = await users(['Tester One'])
  await member.page.goto('/home')
  await expect(member.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
  // Non-tab nav entries live in the account dropdown.
  await member.page.getByRole('button', { name: 'Account menu' }).click()
  await expect(member.page.getByRole('menuitem', { name: 'Settings' })).toBeVisible({ timeout: 10_000 })
  await expect(member.page.getByRole('menuitem', { name: 'Admin' })).toHaveCount(0)
  await member.page.keyboard.press('Escape')

  await member.page.goto('/admin')
  await expect(member.page.getByText('Nothing to see here')).toBeVisible({ timeout: 10_000 })
  await expect(member.page.getByTestId('admin-tiles')).toHaveCount(0)
})

test('admin sees dashboard, signups, and can delete a post', async ({ users }) => {
  const [admin] = await users(['Admin E2E'])
  const runId = Date.now().toString(36)

  // First load triggers ensureAdmin; reload so the role arrives with the
  // fresh WS connect. The Admin entry lives in the account dropdown.
  await admin.page.goto('/home')
  await expect(admin.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
  await admin.page.reload()
  await expect(admin.page.getByTestId('app-navigation')).toHaveAttribute('data-user-role', 'admin', {
    timeout: 15_000,
  })
  await admin.page.getByRole('button', { name: 'Account menu' }).click()
  await expect(admin.page.getByRole('menuitem', { name: 'Admin' })).toBeVisible({ timeout: 10_000 })
  await admin.page.keyboard.press('Escape')

  // Post a tribute to delete from the dashboard.
  const text = `Delete me from admin [${runId}]`
  await admin.page.getByRole('button', { name: /leave a tribute|write the first tribute/i }).first().click()
  const body = admin.page.getByPlaceholder(/what she means to you/i)
  await body.fill(text)
  await admin.page.getByRole('button', { name: /post to the wall/i }).click()
  await expect(admin.page.getByText(text)).toBeVisible({ timeout: 10_000 })

  await admin.page.goto('/admin')
  await expect(admin.page.getByTestId('admin-tiles')).toBeVisible({ timeout: 15_000 })
  // Signups table lists this account.
  await expect(
    admin.page.getByTestId('admin-signups').getByText('admin.e2e@deepspace.test'),
  ).toBeVisible({ timeout: 10_000 })

  // Delete the tribute (ConfirmModal), then confirm it's gone from the wall.
  const post = admin.page.getByTestId('admin-posts').locator('div', { hasText: text }).last()
  await post.getByRole('button', { name: 'Delete' }).click()
  await admin.page.getByRole('button', { name: 'Delete' }).last().click()
  await expect(admin.page.getByTestId('admin-posts').getByText(text)).toHaveCount(0, { timeout: 10_000 })

  await admin.page.goto('/home')
  await expect(admin.page.getByText(text)).toHaveCount(0, { timeout: 10_000 })
})

test('client error reaches the admin log and review status persists', async ({ users }) => {
  const runId = Date.now().toString(36)
  const [member, admin] = await users(['Tester One', 'Admin E2E'])

  // Member hits an uncaught rejection → ErrorLogBridge writes client_errors.
  await member.page.goto('/home')
  await expect(member.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
  const message = `e2e forced error [${runId}]`
  await member.page.evaluate((msg) => {
    setTimeout(() => Promise.reject(new Error(msg)), 0)
  }, message)

  // Admin reviews it.
  await admin.page.goto('/admin')
  await expect(admin.page.getByTestId('admin-errors')).toBeVisible({ timeout: 15_000 })
  const row = admin.page
    .getByTestId('admin-errors')
    .locator('div.rounded-2xl', { hasText: message })
    .first()
  await expect(row).toBeVisible({ timeout: 15_000 })
  await row.getByRole('button', { name: 'Mark reviewed' }).click()
  await expect(row.getByText('reviewed')).toBeVisible({ timeout: 10_000 })

  await admin.page.reload()
  const rowAfter = admin.page
    .getByTestId('admin-errors')
    .locator('div.rounded-2xl', { hasText: message })
    .first()
  await expect(rowAfter.getByText('reviewed')).toBeVisible({ timeout: 15_000 })
})

test('admin rename leaves curated seed cards bylined Forever Dolly', async ({ users }) => {
  const [admin] = await users(['Admin E2E'])

  // First load pokes ensureAdmin (which also upserts the curated seeds);
  // reload so the admin role and the seeded wall are both in place.
  await admin.page.goto('/home')
  await expect(admin.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
  await admin.page.reload()
  await expect(admin.page.getByTestId('app-navigation')).toHaveAttribute('data-user-role', 'admin', {
    timeout: 15_000,
  })

  // Rename the admin — propagation runs inside the action, so once the
  // toast confirms, the server state is final.
  const alias = `Renamed Admin ${Date.now().toString(36)}`
  await admin.page.goto('/settings')
  const nameField = admin.page.getByPlaceholder('A Dolly Fan')
  await expect(nameField).toBeVisible({ timeout: 15_000 })
  await nameField.fill(alias)
  await admin.page.getByRole('button', { name: 'Save' }).click()
  await expect(admin.page.getByText('Name updated')).toBeVisible({ timeout: 10_000 })

  // The seeds carry the admin's authorId but must keep the curated byline.
  await admin.page.goto('/home')
  const seedCard = cardFor(admin.page, 'sack of cornmeal')
  await expect(seedCard).toBeVisible({ timeout: 15_000 })
  await expect(seedCard.getByText('Forever Dolly')).toBeVisible()
  await expect(seedCard.getByText(alias)).toHaveCount(0)
})
