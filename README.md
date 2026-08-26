# ✦ Forever Dolly

A warm, interactive fan tribute to Dolly Parton — a live guest book, a trivia quiz with a realtime leaderboard, and an AI guide to her life and legacy. Built on the [DeepSpace SDK](https://deep.space) for the DeepSpace internship build exercise.

**Live:** https://forever-dolly.app.space

An unofficial fan project. Not affiliated with or endorsed by Dolly Parton.

## What it does

- **Tribute Wall** — signed-in fans leave memories (with an optional place & year); everyone can read. New tributes, edits, and "sparkles" (✦ reactions) appear on every open client in real time. Moderators can hide or pin tributes.
- **The Forever Dolly Quiz** — 8 questions with per-question reveals, graded **server-side** (the answer key never ships to the browser); your best score lands on a live public leaderboard. Share your score as a 1080×1920 story card via the native share sheet.
- **Ask Dolly** — a streamed AI chat that speaks *about* Dolly (never as her), grounded by a hand-written fact sheet, with quick-ask chips. It can also answer questions about this site's own wall and leaderboard through RBAC-scoped record tools.
- **Presence** — the header shows how many fans are here right now.

## DeepSpace capabilities used

| Capability | Where |
|---|---|
| Auth (mixed: public read, gated write) | whole app |
| Realtime data (collections + WS sync) | wall, leaderboard |
| Permissions (server-side RBAC) | own-record edits, moderator hide/pin, hidden-row filtering, server-only score writes |
| Server actions | sparkle increments, per-question grading, quiz submission |
| AI chat (platform-brokered, credit-billed) | Ask Dolly |
| Presence | header counter |

## Development

```bash
nvm use 22
npm install
npx deepspace dev start      # local dev at :5173
npx deepspace test run all   # Playwright suite (uses platform test accounts)
npx deepspace deploy         # ship to forever-dolly.app.space
```

## Repo guide

- `docs/` — requirements, plan (with per-phase testable deliverables), design spec, bug log, handoff notes
- `src/schemas/` — collections + permission rules (the RBAC story lives here)
- `src/actions/` — server actions (sparkles, quiz grading)
- `src/server/quiz-data.ts` — question bank + answer key (worker-only)
- `src/ai/` — chat persona + tool catalog
- `tests/` — Playwright specs run against the real local runtime

Built with a human directing AI agents; every commit notes its provenance. See `docs/handoff.md` for the honest list of accepted trade-offs.
