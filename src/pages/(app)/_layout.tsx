/**
 * Dynamic app boundary — the auth + realtime data layer.
 *
 * `(app)` is a Generouted route group: the parentheses mean it does NOT appear
 * in the URL, so (app)/home.tsx is served at /home. Every page under this
 * folder is wrapped in the DeepSpace providers below, so it may call `useAuth`,
 * `useQuery`, `useMutations`, presence/Yjs hooks, etc.
 *
 * Pages OUTSIDE this folder (top level of src/pages/) get none of this — they
 * render as static pages with no auth fetch and no records WebSocket. Move a
 * page in or out of (app)/ to flip it between dynamic and static. Require
 * sign-in on top of the data layer by nesting under (app)/(protected)/.
 *
 * This is where the app chrome (Navigation) lives, so static pages can present
 * their own layout without inheriting it.
 */

import { Component, Suspense, useEffect, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { DeepSpaceAuthProvider, reportClientError, useAuthStatus, useAuthUser } from 'deepspace'
import { RecordProvider, RecordScope } from 'deepspace'
import Navigation from '../../components/Navigation'
import { ErrorScreen } from '../../components/ErrorScreen'
import { useToast } from '@/components/ui'
import { SCOPE_ID } from '../../constants'
import { schemas } from '../../schemas'
import { callAction } from '../../lib/callAction'
import { ErrorLogBridge, logClientError } from '../../lib/errorLog'

export default function AppLayout() {
  return (
    <DeepSpaceAuthProvider>
      <AuthBoot>
        <div className="flex h-screen flex-col bg-background overflow-hidden">
          <Navigation />
          <main className="flex-1 overflow-y-auto min-h-0">
            <PageErrorBoundary>
              <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>}>
                <Outlet />
              </Suspense>
            </PageErrorBoundary>
            <Footer />
          </main>
        </div>
      </AuthBoot>
    </DeepSpaceAuthProvider>
  )
}

/** Shared footer, per references/design/forever-dolly-app-notes.md § Footer. */
function Footer() {
  return (
    <footer className="border-t px-4 py-8 text-center" style={{ borderColor: '#EDD9C8', background: '#FBEAEE' }}>
      <p className="font-serif text-lg italic" style={{ color: '#3D2B2E' }}>
        Her music. Her heart. Her legacy.{' '}
        <span className="not-italic" style={{ color: '#D4497A' }}>
          ♥ Forever.
        </span>
      </p>
      <p className="mt-2 text-[13px]" style={{ color: '#8A6F73' }}>
        An unofficial fan project. Made with ♥ for Dolly. A guest book, a quiz, and a place to ask
        questions — by fans, for fans.
      </p>
    </footer>
  )
}

/**
 * Waits for auth to resolve, then mounts the data layer. Distinct from the SDK's `AuthGate`.
 *
 * While the initial session check is in flight, renders a fixed full-viewport
 * panel in the theme background — visually identical to the pre-JS page
 * (index.html primes <html> with the same color), so a cold load shows a
 * steady theme-colored screen until the shell appears. No spinner text: the
 * check is one round-trip, and in-flow placeholders read as a layout jump.
 */
function AuthBoot({ children }: { children: ReactNode }) {
  const { isLoaded } = useAuthStatus()
  // Record writes (`create`/`put`/`remove`) are optimistic — they resolve
  // before the server answers, so a denied or invalid write only surfaces
  // through onWriteError. Route rejections to toasts so they're never a
  // silent no-op. Keep this wiring when customizing the layout.
  const { error, warning } = useToast()

  if (!isLoaded) {
    return <div aria-busy="true" className="fixed inset-0 bg-background" />
  }

  return (
    <RecordProvider
      allowAnonymous
      onWriteError={(e) =>
        e.kind === 'permission' ? warning(e.title, e.detail) : error(e.title, e.detail)
      }
    >
      <RecordScope roomId={SCOPE_ID} schemas={schemas}>
        <ErrorLogBridge />
        <AdminBootstrap />
        {children}
      </RecordScope>
    </RecordProvider>
  )
}

/** Pokes the idempotent ensureAdmin action once per signed-in session so the
 *  ADMIN_EMAILS owner picks up the admin role on first load. Renders nothing. */
let adminPoked = false
function AdminBootstrap() {
  const { isSignedIn } = useAuthUser()
  useEffect(() => {
    if (!isSignedIn || adminPoked) return
    adminPoked = true
    void callAction('ensureAdmin', {})
  }, [isSignedIn])
  return null
}

/** Catches page-level render crashes: warm ErrorScreen for the user, one
 *  report to Workers Logs + the admin error log. Chrome (nav/footer) survives. */
class PageErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown }
  static getDerivedStateFromError(error: unknown) {
    return { error }
  }
  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    reportClientError(error, { componentStack: info.componentStack ?? undefined })
    logClientError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: `render:${location.pathname}`,
    })
  }
  render() {
    if (this.state.error !== null) {
      return <ErrorScreen error={this.state.error} onReset={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}
