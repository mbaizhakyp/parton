# Forever Dolly — Design Requirements

Direction from the three Grok mockups: warm blush/cream/gold "guest book" feel. Mockups are mood, not spec — reproduce the palette and typography, not the ornament.

## Tokens

```css
--bg: #FDF6F0;          /* cream */
--surface: #FBEAEE;     /* blush card */
--surface-alt: #FFF9E8; /* gold-tinted card */
--accent: #C9922A;      /* gold */
--accent-strong: #D4497A; /* dolly pink */
--text: #3D2B2E;        /* warm near-black */
--text-muted: #8A6F73;
--border: #EDD9C8;
```

- Light theme only, committed (`color-scheme: light`). No dark variant — the warmth is the identity.
- Fonts (Google Fonts): **Playfair Display** for display/headings, system sans for body. No script font — the logo is styled Playfair.
- Ornament budget: 1px borders, soft gradients, sparkle glyphs (✦ ✨ 🦋). **No** jeweled corners, filigree, embossing, photo textures.

## Layout

- Three tabs: **Wall · Quiz · Ask Dolly**. Header: logo left, tabs center, presence counter right.
- Mobile-first, single column; Wall is the default tab. Leaderboard: sidebar rail ≥1024px, section under the quiz below.
- Footer: "An unofficial fan project. Made with ♥ for Dolly." + what-this-is line. No social links, no fake Privacy/Terms.

## Components

- **Tribute card**: initials avatar (no photos), name, optional "Place, Year" tag, body text, relative time, sparkle button + count. Pinned cards get a gold border + ✦ badge; hidden cards render only for moderators (dimmed, "hidden" tag).
- **Quiz**: one question per screen, progress bar, big tap targets (min 44px). Result screen: score, rank line, Share button.
- **Leaderboard**: rank, name, score, relative time. Top 3 get gold/silver/bronze accents. No avatars.
- **Chat**: bundled ChatPanel, accept default styling; 3 suggestion chips above input ("What inspired Jolene?", "Tell me about the Imagination Library", "What was her childhood like?").

## Share card (1080×1920)

Blush gradient background, thin gold border, ✦ accents. Content top-to-bottom: "FOREVER DOLLY" wordmark, score as the hero ("9/10"), rank/percent line, quiz title, app URL. Rendered from a hidden DOM node styled with these same tokens; Playfair must be loaded before snapshot.

## Imagery & tone rules

- No photographs or realistic likenesses of Dolly or of users. Line-art butterfly/music-note motifs and initials avatars only.
- Copy voice: warm, sincere, lightly playful. Sparkle-y, never snarky.
- AI chat speaks *about* Dolly, never as her; UI label is "Ask about Dolly".
