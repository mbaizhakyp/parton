/**
 * Top nav — sticky, blurred "Forever Dolly" header. Wired to the app's
 * mechanisms: nav.ts-driven links (with role/dev filtering), sign-in via
 * <AuthOverlay>, sign-out, and a fan-count pill sourced from the `stats`
 * collection (total signups, not live presence — see ensureAdmin in
 * src/actions). Restyle freely; keep the data-testid hooks (`app-navigation`,
 * `nav-sign-in-button`, `nav-user-name`, `nav-user-email`) — the shipped
 * tests rely on them. `nav-user-email` is the one that carries an identity
 * the test can check exactly: a display name is optional, the email is the
 * credential the session was opened with.
 *
 * nav.ts stays the source of truth for what's in the nav; this file just
 * decides how each entry renders. The three main tabs (Wall / Quiz / Ask
 * Dolly) get glyph pills centered in the header, per path. Any other entry
 * (Settings, and api-status in dev) renders as a small subtle pill in the
 * header's right cluster instead of the centered row — see
 * references/design/forever-dolly-app-notes.md.
 */

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthOverlay, useAuthProfileReady, usePresenceRoom, useQuery, signOut } from 'deepspace'
import { ChevronDown, LogOut } from 'lucide-react'
import { SCOPE_ID } from '../constants'
import type { Role } from '../constants'
import { nav, type NavItem } from '../nav'
import { cn } from '../lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui'

/** Glyph for each of the three main tabs, keyed by path (design spec). */
const TAB_GLYPH: Record<string, string> = {
  '/home': '♥',
  '/quiz': '✨',
  '/assistant': '🦋',
}

export default function Navigation() {
  const { isLoaded, isSignedIn, user, userLoading } = useAuthProfileReady({ requireUser: true })
  const location = useLocation()
  const navigate = useNavigate()
  const [showAuthModal, setShowAuthModal] = useState(false)
  // "N fans remembering" — total signups (stats.fans, refreshed by
  // ensureAdmin on every sign-in), not a live presence count. Single-row
  // collection, so there's only ever the 'site' record.
  const { records: statsRecords, status: statsStatus } = useQuery<{ fans: number }>('stats', {})
  const fans = statsRecords[0]?.data.fans
  // Still join the presence room (return value unused): the admin "Here now"
  // tile counts peers in this room, and the header mounting on every page is
  // what enrolls ordinary visitors in it.
  usePresenceRoom(`${SCOPE_ID}:presence`)

  const profileReady = !isSignedIn || (!userLoading && !!user)
  const userRole = (user?.role ?? 'anonymous') as Role | 'anonymous'

  const visibleNav = nav.filter((item) => {
    if (item.devOnly && !import.meta.env.DEV) return false
    if (!item.roles) return true
    if (!profileReady) return false
    if (userRole === 'admin') return true
    return item.roles.includes(userRole as Role)
  })

  const mainTabs = visibleNav.filter((item) => item.path in TAB_GLYPH)
  const extraTabs = visibleNav.filter((item) => !(item.path in TAB_GLYPH))

  function isActive(item: NavItem) {
    return location.pathname.startsWith(item.path)
  }

  return (
    <>
      <header
        data-testid="app-navigation"
        data-user-role={userRole}
        className="sticky top-0 z-40 border-b backdrop-blur-[10px]"
        style={{ background: 'rgba(253,246,240,0.92)', borderColor: '#EDD9C8' }}
      >
        <div className="mx-auto max-w-[1160px] px-4">
          <div className="flex h-16 items-center gap-3">
            <Link to="/home" className="flex shrink-0 flex-col justify-center leading-tight">
              <span className="font-serif text-[22px] font-bold italic" style={{ color: '#3D2B2E' }}>
                <span className="not-italic" style={{ color: '#C9922A' }} aria-hidden>
                  ✦
                </span>{' '}
                Forever <span style={{ color: '#D4497A' }}>Dolly</span>
              </span>
              <span
                className="hidden font-sans text-[9px] font-bold md:block"
                style={{ letterSpacing: '0.28em', color: '#C9922A' }}
              >
                A TRIBUTE. A LEGACY. A SISTER.
              </span>
            </Link>

            <div className="hidden flex-1 items-center justify-center gap-2 md:flex">
              {mainTabs.map((item) => (
                <TabPill key={item.path} item={item} active={isActive(item)} />
              ))}
            </div>

            <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
              {statsStatus === 'ready' && fans !== undefined && <PresencePill count={fans} />}

              {!isLoaded ? null : isSignedIn && !profileReady ? (
                /* Signed in, profile still loading — skeleton pill, never the
                   Sign in button (that would offer sign-in to a signed-in user). */
                <div className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5" style={{ borderColor: '#EDD9C8' }}>
                  <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
                  <div className="hidden h-4 w-20 animate-pulse rounded-md bg-muted sm:block" />
                </div>
              ) : isSignedIn && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        aria-label="Account menu"
                        className="group flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 text-sm transition-colors hover:bg-white/40"
                        style={{ borderColor: '#EDD9C8' }}
                      >
                        <Avatar className="h-6 w-6 ring-1 ring-inset" style={{ borderColor: '#EDD9C8' }}>
                          <AvatarImage src={user.imageUrl ?? undefined} referrerPolicy="no-referrer" />
                          <AvatarFallback className="text-[11px]">
                            {(user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          data-testid="nav-user-name"
                          className="hidden max-w-[140px] truncate sm:inline"
                          style={{ color: '#3D2B2E' }}
                        >
                          {user.name || user.email}
                        </span>
                        <ChevronDown
                          className="h-3.5 w-3.5 transition-transform duration-150 group-data-[popup-open]:rotate-180"
                          style={{ color: '#8A6F73' }}
                          aria-hidden
                        />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="truncate font-medium text-foreground">
                        {user.name || 'Signed in'}
                      </div>
                      <div
                        data-testid="nav-user-email"
                        className="truncate text-xs font-normal text-muted-foreground"
                      >
                        {user.email}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {/* Non-main nav entries (Settings, and api-status in dev) live here
                        rather than as their own header pill — there's no room for a
                        fourth pill on mobile, and both are gated pages a signed-in
                        user reaches through their account menu anyway. */}
                    {extraTabs.map((item) => (
                      <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut aria-hidden />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  data-testid="nav-sign-in-button"
                  onClick={() => setShowAuthModal(true)}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundImage: 'linear-gradient(180deg,#E0AE4E,#C9922A)',
                    color: '#FFF9E8',
                    boxShadow: '0 2px 8px rgba(201,146,42,0.25)',
                  }}
                >
                  Sign in
                </button>
              )}
            </div>
          </div>

          {/* Mobile: main tabs drop to a second row under the logo. */}
          <div className="flex items-center gap-2 pb-2 md:hidden">
            {mainTabs.map((item) => (
              <TabPill key={item.path} item={item} active={isActive(item)} mobile />
            ))}
          </div>
        </div>
      </header>

      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
    </>
  )
}

function TabPill({ item, active, mobile = false }: { item: NavItem; active: boolean; mobile?: boolean }) {
  return (
    <Link
      to={item.path}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border font-semibold transition-colors',
        mobile ? 'flex-1 max-w-[150px] text-[13px]' : 'px-4 text-[14px]',
      )}
      style={
        active
          ? { background: '#FBEAEE', color: '#D4497A', borderColor: '#D4497A' }
          : { background: 'transparent', color: '#8A6F73', borderColor: 'transparent' }
      }
    >
      <span aria-hidden>{TAB_GLYPH[item.path]}</span>
      {item.label}
    </Link>
  )
}

function PresencePill({ count }: { count: number }) {
  return (
    <div
      className="inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 text-[13px]"
      style={{ background: '#FFF9E8', borderColor: '#EDD9C8', color: '#8A6F73' }}
    >
      <span className="hidden sm:inline">
        ✦ {count} {count === 1 ? 'fan' : 'fans'} remembering
      </span>
      <span className="sm:hidden">{count}</span>
    </div>
  )
}
