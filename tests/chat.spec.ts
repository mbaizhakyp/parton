/**
 * Ask Dolly chat page — light coverage only. Does NOT assert on a real AI
 * reply (that would call the model and bill credits); the second test mocks
 * both AI routes so no request reaches the real backend, and just exercises
 * the disable-while-pending / re-enable-on-error UI behavior.
 */
import { test, expect } from 'deepspace/testing'

const TRY_PROMPTS = [
  'What inspired Jolene?',
  'Tell me about the Imagination Library',
  'What was her childhood like?',
]

test.describe('Ask Dolly', () => {
  test('page loads with greeting, chips, and input', async ({ users }) => {
    const [user] = await users(1)
    await user.page.goto('/assistant')

    await expect(
      user.page.getByRole('heading', { name: /Ask about Dolly/i }),
    ).toBeVisible({ timeout: 15_000 })

    await expect(
      user.page.getByText(/Hi! I'm here to answer questions about Dolly/),
    ).toBeVisible()

    for (const prompt of TRY_PROMPTS) {
      await expect(user.page.getByRole('button', { name: prompt })).toBeVisible()
    }

    await expect(user.page.getByPlaceholder('Ask me anything about Dolly…')).toBeVisible()
    await expect(user.page.getByRole('button', { name: 'Send message' })).toBeVisible()
  })

  test('sending disables the input while pending, then re-enables after a failed turn', async ({ users }) => {
    const [user] = await users(1)

    // Mock both AI endpoints — no real model call, so this costs nothing and
    // is deterministic. The chat-create route only fires on a fresh chat;
    // returning a fake id either way is harmless since the send route below
    // ignores the chatId in the body entirely.
    await user.page.route('**/api/ai/chats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ chat: { recordId: 'test-chat-1' } }),
      })
    })
    await user.page.route('**/api/ai/chat', async (route) => {
      // Small delay so the pending/disabled state is observable before the
      // (mocked) failure resolves it.
      await new Promise((resolve) => setTimeout(resolve, 300))
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'mocked failure — no model call made' }),
      })
    })

    await user.page.goto('/assistant')

    const input = user.page.getByPlaceholder('Ask me anything about Dolly…')
    const sendButton = user.page.getByRole('button', { name: 'Send message' })

    await input.fill('What inspired Jolene?')
    await sendButton.click()

    await expect(input).toBeDisabled()
    await expect(input).toBeEnabled({ timeout: 10_000 })
    await expect(user.page.getByRole('alert')).toBeVisible()
  })
})
