/**
 * Navigation Config
 *
 * Add one entry per nav item. Routes are handled by generouted
 * (file-based routing in src/pages/), this just controls what
 * appears in the navigation bar.
 */

import type { Role } from './constants'

export interface NavItem {
  path: string
  label: string
  roles?: Role[]
  devOnly?: boolean
}

export const nav: NavItem[] = [
  { path: '/home', label: 'Wall' },
  // Quiz and Ask Dolly are placeholder tabs — the design calls for all three,
  // but F2/F3 (the quiz + AI chat pages) are out of scope for this build.
  { path: '/quiz', label: 'Quiz' },
  { path: '/settings', label: 'Settings' },
  // The /api-status debug page still exists — add
  // `{ path: '/api-status', label: 'API Status', devOnly: true }` to surface it.
  // ── Features add nav items below this line ──
  // Visible to everyone (the page itself prompts sign-in) so the header
  // always shows the design's three tabs.
  { path: '/assistant', label: 'Ask Dolly' },
  // Renders only for the admin role (Navigation filters on `roles`).
  { path: '/admin', label: 'Admin', roles: ['admin'] },
]
