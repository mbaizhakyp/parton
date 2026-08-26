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
