# Morning Handoff — Forever Dolly overnight build

Live: https://forever-dolly.app.space · Repo: github.com/mbaizhakyp/parton

## What was achieved (chronological)

1. Restored the reviewed quiz bank + Dolly fact sheet from git history.
2. **AI key decision:** the platform brokers AI through DeepSpace credits (`createDeepSpaceAI`); there is no bring-your-own-key path. Your OpenAI key was removed from the app's secrets store (unused — nothing reads it). Your local `.env` is untouched and gitignored. Chat bills the signed-in caller's DeepSpace credits (platform default).
3. Installed the platform `ai-chat` feature (ChatPanel, ai-chats collections).
4. Extracted the Claude Design canvas into `docs/design-spec.md` (exact styles, copy, animations, quiz content).
5. **Dolly theme + shell redesign** (deployed): blush/cream/gold tokens, Playfair, sticky blur header with pill tabs (♥ Wall · ✨ Quiz · 🦋 Ask Dolly), presence pill, shared footer, composer modal, redesigned tribute cards (pinned spans, alternating bg, sparkle pop animation), empty state.
6. **Live presence counter** (deployed): `usePresenceRoom` — real count, no fake numbers.
7. **Quiz** (deployed): 8 design questions with per-question reveal (`answerQuestion` action — key stays server-side), `submitQuiz` re-grades everything server-side and upserts your best score keyed by userId; public live leaderboard with top-3 accents; share modal rendering a real 1080×1920 PNG (`html-to-image`) with `navigator.share` on mobile + download + copy-text fallbacks.
8. **Privacy fix from review:** public wall and leaderboard names never fall back to your email (neutral "A Dolly Fan" instead).
9. Playwright suite: wall post regression spec + 2 quiz specs (server grading 8/8, best-score-kept on a worse replay, signed-out leaderboard visibility) — all green against the real local runtime with platform test accounts.

10. **Ask Dolly chat** (deployed): grounded persona system prompt (27-bullet fact sheet, never-as-Dolly + no-gossip rules, RBAC-scoped site-data tools), design-faithful chat card with 🦋 bubbles, quick-ask chips, streaming, per-user conversation persistence. Model picker removed — platform default model.
11. **Full Playwright suite: 15/15 green** (`npx deepspace test run all`).
12. README rewritten for the submission repo; `docs/writeup.md` drafted for the portal (edit to your voice).
13. Live-site screenshots verified at desktop + mobile (`references/design/screenshots/live-*.png`, local only).

## What YOU need to test (in order)

1. Hard-refresh https://forever-dolly.app.space (⌘⇧R — you may have a stale bundle; this was the likely cause of the "second post replaces the first" report, B3).
2. Wall: post two tributes → both stay after a reload. Two tabs: post in A appears in B ≤2s. Sparkle updates live.
3. Permissions (second account in incognito): no edit affordance on others' cards; DevTools direct update setting `pinned: true` rejected.
4. Moderation (your admin account): hide → vanishes for the other account; pin → gold badge + full-width card.
5. Quiz: play it; per-question reveal notes; score lands on the leaderboard live in a second tab; replay with a worse score keeps your best.
6. Share: **on your real phone** — Share my score → native sheet → Instagram Stories accepts the image. Desktop: PNG downloads.
7. Presence: second tab raises the header count.
8. Ask Dolly: send a question (uses YOUR DeepSpace credits) — streams an answer grounded in the fact sheet; try an off-topic question (politely steered back) and a gossip question (declined). Chips send instantly.
9. Read `docs/writeup.md`, edit to your voice, and submit URL + repo + writeup in the portal.

## What YOU need to decide or do

- B3 bug: after the hard-refresh test above, confirm posting twice works → I'll close B3 as stale-bundle. If it still reproduces, tell me exactly what you posted.
- Discord ticket-0246 (legacy gymbro app): still worth sending on the OLD account for the platform's sake, but no longer blocks us.
- AI chat billing: currently each signed-in user pays their own DeepSpace credits (platform default). If you want the app owner to absorb chat costs for reviewers, say so — one-line change in worker chat routes.

## Known ceilings & open items (all marked with ponytail: comments in code)

- Sparkle increment is read-then-write (no atomic increment in SDK) — simultaneous sparkles can undercount by one.
- `answerQuestion` is brute-forceable over replays — accepted for a stakes-free fan quiz; best-score upsert makes it moot.
- Moderators can't post tributes (one role per user); admin can do everything.
- "Sparkled by me" pill state is cosmetic and resets on reload (no per-user sparkle records).
- A hidden tribute disappears from its own author's view (UI choice).

## Commit log for the night

See `git log` — every phase committed separately with model attribution.
