/**
 * Admin-error-log plumbing — the collection half of error reporting.
 *
 * The SDK's installClientErrorReporter() (wired in main.tsx) already ships
 * every uncaught error to Workers Logs. THIS module additionally records
 * signed-in users' errors into the `client_errors` collection so /admin can
 * review them. Non-React code (callAction) enqueues via logClientError();
 * the <ErrorLogBridge/> mounted inside RecordScope drains the queue with a
 * real useMutations create.
 *
 * ponytail: hard cap of 5 records per session + same-message dedupe — an
 * error loop must never flood the collection. Raise the cap if triage ever
 * needs more than the first five distinct failures.
 */

import { useEffect } from 'react'
import { useAuthProfileReady, useMutations } from 'deepspace'

export interface ClientErrorEntry {
  message: string
  stack?: string
  context?: string
}

const MAX_PER_SESSION = 5
const seenMessages = new Set<string>()
let queue: ClientErrorEntry[] = []
let drain: ((entry: ClientErrorEntry) => void) | null = null

/** Safe from anywhere, any time — never throws, drops silently past the cap. */
export function logClientError(entry: ClientErrorEntry): void {
  try {
    if (seenMessages.size >= MAX_PER_SESSION || seenMessages.has(entry.message)) return
    seenMessages.add(entry.message)
    if (drain) drain(entry)
    else queue.push(entry)
  } catch {
    /* a broken reporter must not break the app it watches */
  }
}

/** Mount once inside RecordScope. Renders nothing. */
export function ErrorLogBridge() {
  const { isSignedIn, user } = useAuthProfileReady({ requireUser: true })
  const { create, ready } = useMutations<{
    userName?: string
    message: string
    stack?: string
    context?: string
    userAgent?: string
  }>('client_errors')

  useEffect(() => {
    if (!ready || !isSignedIn) return
    const userName = user?.name || 'A Dolly Fan'
    drain = (entry) => {
      // Fire-and-forget: an optimistic create; denial surfaces nowhere (by
      // design — error logging must never trigger error UI).
      void create({
        userName,
        message: entry.message.slice(0, 500),
        stack: entry.stack?.slice(0, 4000),
        context: entry.context?.slice(0, 200),
        userAgent: navigator.userAgent,
      }).catch(() => {})
    }
    const pending = queue
    queue = []
    pending.forEach(drain)

    return () => {
      drain = null
    }
  }, [ready, isSignedIn, user?.name, create])

  return null
}

// Window listeners attach at module load — NOT in the React effect — so
// errors during app boot (before the records WS is ready) still queue and
// drain once the bridge mounts. Boot-time crashes are precisely the ones
// worth capturing.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e: ErrorEvent) =>
    logClientError({ message: e.message || 'Unknown error', stack: e.error?.stack, context: location.pathname }),
  )
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const r = e.reason
    logClientError({
      message: r instanceof Error ? r.message : String(r ?? 'Unhandled rejection'),
      stack: r instanceof Error ? r.stack : undefined,
      context: location.pathname,
    })
  })
}
