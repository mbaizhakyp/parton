# Forever Dolly — Build Plan

Timebox: 6–8h. Deploy after every phase; the live URL must never be more than one phase stale.

## Phases

| # | Phase | Budget | Output |
|---|---|---|---|
| 0 | Scaffold, auth, first deploy | 1h | Skeleton live at `<name>.app.space` |
| 1 | Collections + permissions (`tributes`, `scores`; moderator role, own-record rules) | 0.5h | Schema deployed; rules verified from a second account |
| 2 | Tribute wall (post, sparkle, edit-own; mod hide/pin) | 2h | F1 live |
| 3 | Quiz + server-graded scoring + live leaderboard | 2h | F2 live |
| 4 | AI chat (persona prompt + fact sheet + chips) | 1h | F3 live |
| 5 | Presence counter | 0.25h | F4 live |
| 6 | Share card (html-to-image + navigator.share) | 1h | F5 live |
| 7 | Theme polish, mobile pass, writeup | 1h | Submission ready |

Cut lines if over budget, in order: share card → presence → mod pinning (keep hide). Never cut: server-side grading, permissions rules.

## Testable deliverables per phase

Each phase ends with checks the user can run themselves. A phase isn't done until its checks pass.

**Phase 0 — live skeleton**
- [ ] https://forever-dolly.app.space loads (scaffold landing page)
- [ ] Sign-in works; `/home` renders when signed in
- [ ] `npx deepspace app list` shows the app with an `app_…` id

**Phase 1 — collections + permissions** *(structural checks now; behavioral proof needs UI or a test spec — see note)*
- [ ] `src/schemas/tributes-schema.ts` review: member `writableFields` exclude `hidden`/`pinned`/`sparkles`; `ownerField: authorId`; `visibilityField` gates hidden rows; moderator writes only `hidden`/`pinned`
- [ ] `src/schemas/scores-schema.ts` review: no client role has create/update
- [ ] `npx tsc --noEmit` exits clean
- [ ] Deploy succeeded with the schemas registered (it did — schema errors fail the deploy)
- Note: end-to-end permission proof (second account rejected editing your tribute, forged score rejected) is exercised in phases 2–3 checks below, or earlier via an optional Playwright multi-user spec (`references/docs/guides/testing.md`) — approval-gated.

**Phase 2 — tribute wall**
- [ ] Two browser tabs: tribute posted in tab A appears in tab B ≤2s, no refresh
- [ ] You can edit/delete your own tribute; no edit affordance on others'
- [ ] DevTools forgery: direct record update setting `pinned: true` on your own tribute is rejected by the server
- [ ] Moderator account: hide a tribute → it vanishes for a non-mod tab; pin → gold badge for everyone
- [ ] Sparkle count increments live in both tabs

**Phase 3 — quiz + leaderboard**
- [ ] Complete the quiz → score appears on the leaderboard in a second tab ≤2s
- [ ] Answer key absent: search DevTools Network + JS bundles for a correct-answer field — nothing
- [ ] DevTools forgery: direct create on `scores` is rejected by the server
- [ ] Replaying updates your entry per the chosen rule (best score kept)

**Phase 4 — AI chat**
- [ ] Response streams token-by-token; history survives a reload
- [ ] 5 answers spot-checked against `docs/dolly-facts.md`
- [ ] Off-topic question politely declined; never speaks as Dolly

**Phase 5 — presence**
- [ ] Second tab raises the header count within seconds; closing it lowers the count

**Phase 6 — share card**
- [ ] Real phone: share button opens native sheet with the image; Instagram Stories accepts it
- [ ] Desktop: PNG downloads; card shows correct score + URL, Playfair rendered

**Phase 7 — polish + writeup**
- [ ] Full core path (post → quiz → chat → share) on a real phone against the live URL
- [ ] Writeup covers: capabilities, main tradeoff, what agents did, what was verified by hand

## Agentic workflow (model routing)

Fable 5 orchestrates only: task briefs, code review, integration decisions, verification, deploys. Implementation is delegated.

| Work | Model |
|---|---|
| Boilerplate, config, copy/content (quiz questions, fact sheet draft), mechanical edits | Haiku |
| Feature implementation (wall UI, quiz UI, chat wiring, share card), doc lookups in `references/` | Sonnet |
| Hairy debugging, permissions/server-action design if Sonnet stalls | Opus |
| Briefs, reviewing diffs, cross-feature integration, final verification, deploy decisions | Fable (orchestrator) |

Rules:
- Every delegated task gets: the goal, the relevant doc paths under `references/docs/`, and acceptance criteria from `docs/requirements.md`.
- Orchestrator reviews every diff before deploy; nothing merges unreviewed.
- Escalate one level (Haiku→Sonnet→Opus) after one failed attempt; don't loop a stuck model.

## Verification checklist (by hand, for the writeup)

- [ ] Permissions: from a non-mod account, attempt to edit another user's tribute and to hide one — both rejected server-side
- [ ] Leaderboard: two browser tabs; score submitted in tab A appears in tab B ≤2s
- [ ] Grading: confirm answer key absent from all client bundles/network responses; forged score request rejected
- [ ] Chat: fact-check 5 answers against fact sheet; confirm it declines an off-topic question
- [ ] Share: real iPhone — share sheet opens with image, Stories accepts it; desktop download works
- [ ] Mobile: full core path on a real phone against the deployed URL

## Risks

- `navigator.share` file support variance → test in phase 6 immediately, not at the end (fallback: download-only, still shippable)
- Bundled ChatPanel styling clashes with theme → accept default look over re-skinning (timebox)
- Deploy surprises → mitigated by phase-0 deploy and per-phase deploys
