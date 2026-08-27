/**
 * Landing page — a STATIC page.
 *
 * It lives at the top level of src/pages/ (not under (app)/), so it renders
 * with no DeepSpace providers: no auth session fetch, no records WebSocket.
 * That makes it cheap to serve and safe for logged-out / crawler traffic.
 * Design tokens are inlined (no app theme providers out here).
 */

import { Link } from 'react-router-dom'

const CREAM = '#FDF6F0'
const GOLD = '#C9922A'
const PINK = '#D4497A'
const INK = '#3D2B2E'
const MUTED = '#8A6F73'

export default function Landing() {
  return (
    <div
      data-testid="static-landing"
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: CREAM, color: INK }}
    >
      <p className="mb-3 text-sm uppercase tracking-[0.25em]" style={{ color: GOLD }}>
        ✦ Forever Dolly ✦
      </p>
      <h1 className="mb-4 max-w-2xl font-serif text-4xl font-bold tracking-tight sm:text-6xl">
        For the love of Dolly
      </h1>
      <p className="mb-8 max-w-md text-[17px] leading-relaxed" style={{ color: MUTED }}>
        A warm little corner of the internet for Dolly Parton fans — share what
        she means to you, test your trivia on the leaderboard, and ask anything
        about her life and legacy.
      </p>
      <Link
        to="/home"
        className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: PINK }}
      >
        Step inside <span aria-hidden>♥</span>
      </Link>
      <p className="mt-10 text-xs" style={{ color: MUTED }}>
        An unofficial fan tribute — not affiliated with Dolly Parton.
      </p>
    </div>
  )
}
