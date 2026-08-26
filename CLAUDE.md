# Forever Dolly

Unofficial Dolly Parton fan tribute — internship build exercise on the DeepSpace SDK. Mobile-first. Timebox: 6–8h.

## Read first

- `docs/requirements.md` — features, acceptance criteria, capability mapping
- `docs/plan.md` — phase order, budgets, cut lines, model routing, verification checklist
- `docs/design.md` — tokens, layout, component specs, imagery rules
- `docs/bugs.md` — bug log; log when found, root cause before FIXED
- `references/docs/` — full DeepSpace docs mirror (gitignored); `references/llms.txt` is the index
- `task.txt` — the original exercise brief

## Orchestration

Fable 5 orchestrates (briefs, diff review, integration, verification, deploys). Implementation is delegated: Haiku for boilerplate/content, Sonnet for features, Opus only on escalation after one failed attempt. Every brief includes: goal, relevant `references/docs/` paths, acceptance criteria from requirements.md.

## Hard rules (never cut, never violate)

1. Quiz grading is server-side (server action); the answer key never ships to the client.
2. Permissions are collection-level rules enforced in the worker — never client-side checks alone.
3. Use DeepSpace primitives (auth, records/sync, RBAC, ai-chat, presence) — do not reimplement them. Dependency budget: `html-to-image` only; new deps need explicit approval.
4. No real-likeness imagery of Dolly or users; no scraped copyrighted content. AI speaks *about* Dolly, never as her.
5. Secrets live only in the platform secrets store — never in the repo or client code.
6. Deploy after every phase; commit small, one concern per commit.
7. Light theme only, tokens from `docs/design.md`.
