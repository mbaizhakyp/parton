import type { Page } from '@playwright/test'

/**
 * Fetches a fresh action-call Bearer token the same way the app's own
 * `callAction` helpers do (home.tsx / quiz.tsx): POST /api/auth/token with
 * the browser's session cookie (page.request shares the context's cookie
 * jar), which is exactly the SDK's `getAuthToken()` implementation
 * (dist/index.js) minus its in-memory cache. Returns null when signed out
 * (the endpoint answers non-2xx with no session cookie).
 */
export async function actionToken(page: Page): Promise<string | null> {
  const res = await page.request.post('/api/auth/token', {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok()) return null
  const data = (await res.json().catch(() => null)) as { token?: string } | null
  return data?.token ?? null
}

/**
 * Direct fetch to a server action from a page's own authenticated channel —
 * same endpoint, same auth header shape as src/actions/index.ts callers, but
 * driven from the test instead of the UI. Pass `token: null` to force a
 * signed-out call regardless of the page's session.
 */
export async function callAction(
  page: Page,
  name: string,
  params: Record<string, unknown>,
  token?: string | null,
): Promise<{ status: number; body: { success?: boolean; data?: unknown; error?: string } | null }> {
  const authToken = token === undefined ? await actionToken(page) : token
  const res = await page.request.post(`/api/actions/${name}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    data: params,
  })
  const body = await res.json().catch(() => null)
  return { status: res.status(), body }
}
