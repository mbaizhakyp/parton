/**
 * The one shared server-action caller (was copy-pasted in home.tsx and
 * quiz.tsx). Same shape as the docs' callAction example (server-actions
 * guide), plus the error seam: every failed action — non-ok HTTP, failed
 * JSON, network throw — is reported to the admin error log (fire-and-forget)
 * before being returned to the call site, whose own toast handling stays
 * exactly as it was.
 */

import { getAuthToken } from 'deepspace'
import { logClientError } from './errorLog'

export interface ActionResult {
  success: boolean
  data?: unknown
  error?: string
}

export async function callAction(
  name: string,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const token = await getAuthToken()
    const res = await fetch(`/api/actions/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
    })
    const body = (await res.json()) as ActionResult
    if (!res.ok || !body.success) {
      logClientError({
        message: `Action ${name} failed: ${body.error ?? `HTTP ${res.status}`}`,
        context: `action:${name}`,
      })
    }
    return body
  } catch (e) {
    logClientError({
      message: `Action ${name} threw: ${e instanceof Error ? e.message : String(e)}`,
      stack: e instanceof Error ? e.stack : undefined,
      context: `action:${name}`,
    })
    return { success: false, error: 'Network error — please try again.' }
  }
}
