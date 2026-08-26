# Forever Dolly App.dc.html — extracted implementation spec

Source: Claude Design project c4d4956b (canvas frames the app at desktop 1280 and phone 390).
This file is the authoritative extraction; exact inline-style values below are from the design HTML.

## Global

- Page ground: `linear-gradient(180deg, #FBEAEE 0%, #FDF6F0 320px)`; text #3D2B2E; system sans body; Playfair Display headings (weights 400/600/700 + italics).
- Focus rings: `outline: 2px solid #C9922A; outline-offset: 1px`.
- Animations: `sparklePop` (scale 1→1.25→1, 0.35s) on sparkle click; `fadeUp` (opacity 0 + translateY 6px → none, 0.3s) on section mount, 0.25s on modals/toast.
- Links: #C9922A, hover #D4497A.

## Header (sticky, z-40)

- `background: rgba(253,246,240,0.92); backdrop-filter: blur(10px); border-bottom: 1px solid #EDD9C8`; inner max-width 1160px.
- Logo: Playfair 700 italic 22px: `✦ Forever Dolly` — ✦ gold #C9922A non-italic, "Dolly" #D4497A. Desktop-only kicker under it: `A TRIBUTE. A LEGACY. A SISTER.` 9px, letter-spacing 0.28em, #C9922A, 700.
- Tabs centered as pills: `♥ Tribute Wall`, `✨ Quiz`, `🦋 Ask Dolly`. Active: bg #FBEAEE, color #D4497A, border #D4497A. Inactive: transparent bg/border, color #8A6F73. Radius 999px, 600 weight, 14px (13px mobile, min-height 40, flex-1 max-w 150px in a second row under logo).
- Presence pill right: `✦ {N} remembering right now` (mobile: just the number) — bg #FFF9E8, border #EDD9C8, radius 999px, 13px #8A6F73.

## Wall

- Heading centered: Playfair 700 40px `✦ Tribute Wall ✦` (✦ gold 24px, "Wall" #D4497A); sub copy #8A6F73 15px max-w 520px: "Real memories, from real hearts — honoring the woman who showed us kindness, strength, and sparkle."
- Dotted divider: two `2px dotted #EDD9C8` lines flanking a pink ♥ (max-w 420px).
- CTA button (gold style used app-wide): `border 1px solid #C9922A; background linear-gradient(180deg,#E0AE4E,#C9922A); color #FFF9E8; 600; radius 999px; box-shadow 0 2px 8px rgba(201,146,42,0.25)` — `✦ Leave a tribute`, min-height 44.
- Composer is a MODAL (fixed inset overlay rgba(61,43,46,0.35)): card `linear-gradient(170deg,#FDF6F0,#FFF9E8)`, border #EDD9C8, radius 18px, max-w 440px. Title Playfair 22px "Leave a tribute"; "Signing as {name}"; ONE optional field `Place, Year` (placeholder "e.g. Knoxville, 2003") + textarea "What she means to you…" (rows 4); Cancel (outline muted) + `Post to the Wall ✦` (gold). Inputs: bg #FFF9E8, border #EDD9C8, radius 10px, min-height 44.
- Empty state card: bg #FFF9E8 border #EDD9C8 radius 16px, centered: 🦋 34px, Playfair 20px "The wall is waiting for its first note", sub "Be the one who starts the guest book.", outline-gold button "Write the first tribute".
- Grid: desktop `1fr 1fr`, mobile `1fr`, gap 14px; pinned card spans full row (`1 / -1`) on desktop.
- Tribute card: radius 16px, padding 16/18, border #EDD9C8 (pinned: #C9922A). Background alternates #FBEAEE / #FFF9E8 by index; pinned: `linear-gradient(160deg,#FFF9E8,#FBEAEE)`. Row: 40px initials avatar (`linear-gradient(135deg,#FBEAEE,#EDD9C8)`, border #EDD9C8, Playfair 700 15px gold), name 600 15px, tag line 13px #8A6F73 with pink `⚲`; badges right: pinned `✦ Pinned` (gold border/text, bg #FFF9E8, 999px) / hidden `hidden` (dashed #8A6F73 border, muted). Body 15px/1.55. Footer row: relative time 13px #8A6F73, spacer, sparkle button `✦ {n}` (999px pill, min-h 32; un-sparkled: border #EDD9C8, bg rgba(253,246,240,0.6), color #8A6F73; sparkled-by-me: border/color #D4497A, bg #FBEAEE; sparklePop animation on click). Hidden cards opacity 0.5 (mods only).

## Wall rail (≥1024px, sticky top 86px, width 316px)

1. Leaderboard card (bg #FFF9E8, border #EDD9C8, radius 16px): header Playfair 17px `✦ Live Quiz Leaderboard` + `● LIVE` 11px #D4497A; top-5 rows: 24px rank circle (1: gold gradient + cream text; 2: #EDD9C8; 3: #E0B08A; others transparent w/ border), name 13px 600 ellipsis, score gold 700; dividers #EDD9C8; footer link-button "View full leaderboard →" gold.
2. Ask-Dolly teaser card (`linear-gradient(160deg,#FBEAEE,#FDF6F0)`): 52px pink-gradient ♥ circle, Playfair 18px #D4497A "Ask about Dolly", sub "Share your heart. Get a little Dolly wisdom.", gold button `Ask now ✦`.
3. Motto card: `✦ In Dolly We Trust` (Playfair 15px) / "Be kind. Love hard. Shine on." 13px muted.

## Quiz (max-w 1040 with rail; card column max-w 680)

- Intro card (`linear-gradient(170deg,#FBEAEE,#FFF9E8)`, radius 18): ✦ 26px, kicker `THE FOREVER DOLLY QUIZ` (12px 700, ls 0.22em, gold, uppercase), Playfair 34px "How well do you know Dolly?" (Dolly pink), sub "8 questions · no timer · pure heart", gold `Start the quiz →` (min-h 48).
- Question card: `QUESTION {n} OF {total}` 12px ls 0.14em muted + `{pct}%` gold right; progress bar 8px track #EDD9C8, fill `linear-gradient(90deg,#E0AE4E,#C9922A)`, animated width. Question Playfair 24px. Options: full-width left-aligned rows (min-h 52, radius 12, border #EDD9C8, bg rgba(253,246,240,0.7)) with 28px letter circle (A-D, gold text, bg #FDF6F0); after answering — correct: border/mark gold, bg #FFF9E8, mark `✦ correct`; picked-wrong: border #D4497A, bg #FBEAEE, mark `not quite` (pink). After answer: italic note line (per-question fact) + gold `Next question →` / `See my score →`.
- Result card (border gold): kicker `✦ Your score ✦`, Playfair 68px pink `{score}/{total}`, rankLine 16px 600, rankQuip 14px muted, buttons: gold `Share my score ✦` + outline-gold `Play again`.
  - rankLine: 8/8 "A perfect score — pure rhinestone!", ≥6 "You out-sparkled {60+score*4}% of fans", ≥3 "You out-sparkled {30+score*5}% of fans", else "Every fan starts somewhere ✦".
  - rankQuip: 8/8 "Dolly would be proud. We're a little proud too.", ≥6 "Certified Smoky Mountain scholar.", ≥3 "A respectable showing — spin the records and try again.", else "The best excuse to listen to more Dolly."
- Leaderboard: rail (≥1024, width 300, top-8, sticky) or section below (no-rail): rows add relative time (12-13px muted) between name and score; footer line `↻ Updating live · new scores in real time`.

## Quiz content (8 questions, each with post-answer note) — REPLACES the 10-question bank; verify facts on integration

1. Where was Dolly Parton born? [Nashville / **Locust Ridge, Tennessee** / Asheville / Memphis] — "A one-room cabin in Locust Ridge, in the Smoky Mountains."
2. What childhood gift inspired "Coat of Many Colors"? [**A patchwork coat her mother sewed** / guitar / hymnal / red shoes] — "Her mother stitched it from rags — and made it a story of love."
3. Which Dolly song became a worldwide hit for Whitney Houston? [Jolene / 9 to 5 / **I Will Always Love You** / Islands in the Stream] — "Written in 1973 — Whitney's 1992 version topped charts everywhere."
4. Name of Dolly's theme park in Pigeon Forge? [Dollyland / Smoky Park / Butterfly Grove / **Dollywood**] — "Opened in 1986, in her beloved East Tennessee."
5. Imagination Library mails children what, every month? [toy / **A free book** / song / postcard] — "A free book from birth to age five — over 200 million mailed."
6. How many siblings did Dolly grow up with? [3 / 5 / **11** / 14] — "She was the fourth of twelve children."
7. "Jolene" and "I Will Always Love You" were reportedly written… [decade apart / **On the same day** / same film / one night on tour] — "One legendary songwriting session, as Dolly tells it."
8. Dolly's signature creature? [Hummingbird / Firefly / **Butterfly** / Dove] — "Butterflies — free, gentle, and never hurting a soul."

## Ask Dolly (max-w 680)

- Heading: Playfair 34px `✦ Ask about Dolly ✦`; sub "Curious about her songs, life, or legacy? Ask anything — it speaks about Dolly, never as her."
- Chat card (`linear-gradient(170deg,#FBEAEE,#FFF9E8 30%)`, radius 18, min-h 360): messages — assistant: 28px 🦋 avatar circle, bubble bg rgba(253,246,240,0.85) border #EDD9C8; user: right-aligned (row-reverse), bg/border #D4497A, text #FFF9E8; bubbles radius 14, 14px/1.5, max-w 82%. Thinking: `✦ thinking…` muted.
- Greeting message: "Hi! I'm here to answer questions about Dolly — her songs, her story, her library that mails kids free books. What are you curious about? ✦"
- Chips under "Try asking…": "What inspired Jolene?" / "Tell me about the Imagination Library" / "What was her childhood like?" — bg #FFF9E8, border #EDD9C8, radius 12.
- Input row: pill input (bg #FDF6F0, border #EDD9C8, 999px, placeholder "Ask me anything about Dolly…") + gold `Send ✦`.
- System prompt (design's, to be augmented with docs/dolly-facts.md): "You are a warm, knowledgeable guide for a Dolly Parton fan site called Forever Dolly. Answer questions ABOUT Dolly Parton — her life, music, philanthropy, and career. Never speak as Dolly or imitate her voice. Keep answers to 2-4 sentences, sincere and lightly playful. If asked something unrelated to Dolly, gently steer back."

## Share modal

- Overlay rgba(61,43,46,0.45). Card preview: 1080×1920 rendered node scaled 0.26 (281×499 visible), radius 14, big shadow. Card: `linear-gradient(160deg,#FBEAEE 0%,#FDF6F0 55%,#FFF9E8 100%)`, border 4px solid #C9922A, centered column, gaps 30, padding 100/80: `✦ ✦ ✦` gold 44px ls 0.5em → `FOREVER DOLLY` Playfair 72px ls 0.14em → `{score}/{total}` Playfair 300px pink → rankLine 46px 600 → `The Forever Dolly Quiz` Playfair italic 52px muted → `✦ ✦ ✦` → app URL 40px gold 600. (Design shows `foreverdolly.fan`; use the real deployed URL.)
- Buttons: gold primary (share/download/copy) + cream-outline `Close`.

## Footer

- `border-top #EDD9C8; background #FBEAEE`, centered: Playfair italic 18px "Her music. Her heart. Her legacy. ♥ Forever." (♥ Forever. pink, non-italic) + 13px muted "An unofficial fan project. Made with ♥ for Dolly. A guest book, a quiz, and a place to ask questions — by fans, for fans."

## Toast

- Fixed bottom-center pill: bg #3D2B2E, text #FDF6F0, `✦ {msg}`, radius 999.

## Deviations from design (approved license)

- Sign-in modal in design is name-only mock → real platform auth (AuthOverlay) instead; keep the modal's copy ("Sign in to leave a tribute" / "The wall stays kind — every note has a name.") on the auth prompt where feasible.
- Design's seed tributes/leaders are placeholder content — do NOT seed fake users; empty state covers the cold start. Presence count is real, not 214.
- Share: design has copy-text only → also render real PNG (html-to-image) + navigator.share files on mobile; copy-text stays as fallback.
