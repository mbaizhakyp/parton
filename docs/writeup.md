# Submission writeup — Forever Dolly

*(Draft for the portal submission — trim to taste. First-person = the applicant.)*

**Live URL:** https://forever-dolly.app.space
**Repository:** https://github.com/mbaizhakyp/parton

## What I built

Forever Dolly is a fan tribute to Dolly Parton: a realtime tribute wall (a guest book with ✦ sparkle reactions and moderation), an 8-question trivia quiz graded server-side with a live public leaderboard and an Instagram-story share card, an "Ask Dolly" AI chat grounded by a hand-written fact sheet, and a live presence counter. Visitors can read everything signed-out; posting, playing, and chatting require sign-in.

## Platform capabilities used

Auth (mixed public/gated), realtime records (wall + leaderboard over WS sync), server-side RBAC permissions, server actions, platform AI chat, and presence — six in total. Permissions do real work: members edit only their own tributes and can't touch `hidden`/`pinned`/`sparkles`; a dedicated moderator role can hide/pin but cannot edit anyone's text; hidden tributes are filtered server-side (`visibilityField`) so non-moderators never receive them; the scores collection accepts no client writes at all — only the grading server action, which re-grades every submission against a worker-only answer key.

## The main tradeoff

For the AI chat I chose a curated system prompt (a ~27-bullet fact sheet in my own words, plus hard persona boundaries) over scraping interviews for RAG. The model already knows a heavily documented public figure; retrieval would have added copyright exposure and a day of plumbing for marginal accuracy inside a 6–8 hour timebox. The same philosophy shaped scope: I cut a planned "Which Dolly Era Are You?" personality quiz because it exercised no platform capability, and spent the time on server-authoritative grading and permissions instead.

## What the AI agents did, and what I did

I directed Claude Code as an orchestrator with cheaper models doing implementation: Sonnet subagents built the schemas, wall, quiz, chat reskin, and theme from written briefs that pointed at the SDK docs; the orchestrator reviewed every diff before it merged, and I approved each phase. The commit history records provenance per commit. Agent review caught real issues: an agent-written create call that sent a server-stamped `userBound` field (rejected posts — root-caused by reading the worker source), and public leaderboard/wall names falling back to users' email addresses (privacy leak, fixed before deploy). The platform itself corrected my plan once: I'd assumed a BYO OpenAI key for chat, but DeepSpace brokers AI through credits, so the key was removed as unnecessary.

## What I verified myself

- Permissions from a second, non-privileged account: no edit affordance on others' tributes; direct DevTools writes setting `pinned` rejected server-side; direct creates on `scores` rejected.
- Two-browser realtime: tributes, sparkles, and leaderboard rows appearing live in a second tab.
- Server grading: answer key absent from client bundles and network responses; a worse replay keeps the best score.
- The share card on a real phone: native share sheet → Instagram Stories.
- Chat: spot-checked answers against the fact sheet; confirmed it declines gossip and never speaks as Dolly.
- The Playwright suite (15 specs, real local runtime + platform test accounts) green: `npx deepspace test run all`.

## Unfinished edges (honest list)

Sparkle increments are read-then-write (no atomic increment primitive — simultaneous clicks can undercount by one); per-question answers are brute-forceable across replays (accepted for a stakes-free quiz; best-score upsert makes it moot); moderators can't post (one role per user); "sparkled by me" styling resets on reload (no per-user reaction records). Next, with more hours: per-user sparkle records with `uniqueOn` (one sparkle per fan, survives reload), the wall's leaderboard rail from the design, and the personality quiz as pure fun.
