# Forever Dolly — Project Requirements

Internship build exercise (see `task.txt`). Timebox: 6–8 hours. Evaluation-only; applicant owns the submission.

## Product

A warm, interactive fan tribute to Dolly Parton. Unofficial fan project (disclaimed in footer). Mobile-first web app deployed to `<name>.app.space`.

## Users

- **Visitor** (signed out): reads the wall, sees leaderboard and presence count.
- **Member** (signed in): posts tributes, sends sparkles, plays the quiz, uses AI chat, shares score card.
- **Moderator**: everything above, plus hide/pin tributes.

## Features & acceptance criteria

### F1. Tribute wall
- Signed-in users post a memory (text, optional place/year tag).
- Tributes appear on all open clients in ≤2s without refresh.
- "Send a sparkle" reaction; live count on each card.
- Authors can edit/delete only their own tributes (server-enforced).
- Moderators can hide and pin any tribute (server-enforced role rule).

### F2. Dolly trivia quiz + live leaderboard
- One quiz, 10 static questions, one attempt shown at a time.
- Grading runs in a server action; answer key never reaches the client. Score cannot be forged from DevTools.
- Leaderboard (top scores, name, recency) updates live on all clients.

### F3. "Ask about Dolly" AI chat
- Bundled ai-chat feature: streamed responses, persistent history.
- System prompt: warm persona, answers *about* Dolly (never as her), declines off-topic/gossip; grounded by a hand-written fact sheet.
- 3 suggested-question chips.

### F4. Presence counter
- Header shows "🦋 N people remembering right now", live.

### F5. Instagram Story share card
- After quiz: "Share your result" renders a 1080×1920 PNG (score, rank line, app URL) from a styled DOM node via `html-to-image`.
- Mobile: `navigator.share({files})` → native share sheet (Instagram Stories target). Desktop: PNG download fallback.

## Capability mapping (requirement: ≥3)

| Feature | DeepSpace capability |
|---|---|
| Sign-in | auth (mixed: public read, gated write) |
| Wall, leaderboard | realtime data (collections + sync) |
| Own-record edits, moderator role | permissions (server-side RBAC) |
| Quiz grading | server actions |
| Chat | AI chat |
| Counter | presence |

## Out of scope (writeup: "what I'd do next")

Personality quiz ("Which Dolly Era Are You?"), tribute detail view, second quiz theme, gallery/songs pages, RAG over interviews, payments/storage/background jobs (no honest use here).

## Non-functional

- Mobile-first responsive; single column on phones.
- No real-likeness imagery; line-art motifs and initials avatars.
- No scraped copyrighted content; fact sheet written in own words.
- Secrets only in platform secrets store; nothing in repo or client.

## Submission checklist

- [ ] Live URL working on core path
- [ ] Repository
- [ ] Writeup: what was built, capabilities used, main tradeoff (prompt-over-RAG), what the agent did, what was verified by hand
