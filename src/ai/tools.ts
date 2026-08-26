/**
 * AI Tool Definitions — converts DeepSpace BUILT_IN_TOOLS to Vercel AI SDK tools.
 *
 * The assistant can read AND modify data. Per-collection RBAC at the DO
 * layer is the actual security boundary — the user's role determines what
 * each tool call is allowed to do, regardless of what's in this allowlist.
 * Trim entries below if you want a stricter assistant for your app.
 */

import { tool } from 'ai'
import type { ToolSet } from 'ai'
import { z } from 'zod/v4'
import { BUILT_IN_TOOLS, applyAiToolDefaults } from 'deepspace/worker'
import type { ToolSchema, CollectionSchema } from 'deepspace/worker'

type ToolExecutor = (toolName: string, params: Record<string, unknown>) => Promise<unknown>

const ALLOWED_TOOL_NAMES = [
  'schema.list',
  'schema.describe',
  'records.query',
  'records.get',
  'records.create',
  'records.update',
  'records.delete',
  'user.current',
]

// ============================================================================
// System prompt — "Ask Dolly" persona
// ============================================================================

// Condensed from docs/dolly-facts.md, in this file's own words (no quotes or
// lyrics) so the model has a grounded, low-hallucination base to answer from.
// Keep this list short enough to sit comfortably in every turn's system
// prompt — it's a grounding sheet, not the full fact file.
const DOLLY_FACT_SHEET = `
- Dolly Rebecca Parton was born January 19, 1946, in Sevier County, Tennessee.
- She grew up in the Great Smoky Mountains region of East Tennessee in a large, modest-means family.
- She was the fourth of twelve children.
- She began writing and performing songs as a child, encouraged by musical family members.
- As a teenager she appeared on local Knoxville television and radio before her career took off.
- She moved to Nashville right after high school to pursue music.
- She signed with Monument Records early on before moving toward country music.
- She gained wide recognition performing on "The Porter Wagoner Show" in the late 1960s/early 1970s.
- She left that show to launch a solo career — a major turning point for her.
- "Jolene" is one of her most famous and most-covered songs, about pleading with a rival not to take her man.
- "I Will Always Love You" was written as a farewell to Porter Wagoner when she went solo, and became a massive pop hit for Whitney Houston in 1992.
- She has said "Jolene" and "I Will Always Love You" were written around the same period.
- "9 to 5" was the title song for the 1980 film she co-starred in with Jane Fonda and Lily Tomlin.
- She's regarded as one of the most prolific and successful songwriters in country music history, often writing from personal experience.
- She's built a business empire well beyond recording, including music publishing and production ventures.
- Dollywood is her theme park in Pigeon Forge, Tennessee, grown out of the earlier Silver Dollar City and co-owned with Herschend Family Entertainment.
- Dollywood opened in 1986 and has since expanded to include a water park and resort accommodations.
- She founded the Dollywood Foundation to support causes in her home region of East Tennessee.
- Her best-known philanthropic program is Dolly Parton's Imagination Library, which mails a free book every month to enrolled children from birth until they start school.
- The Imagination Library began in her home county and has expanded to reach children in many other regions — over 200 million books mailed.
- She's spoken about her own father's difficulty reading as part of what motivated the program.
- She made a significant donation toward COVID-19 vaccine research that helped fund work at Vanderbilt University Medical Center.
- She has supported wildfire relief for communities near her Tennessee home after natural disasters.
- She's a Country Music Hall of Fame inductee and has won multiple Grammy Awards.
- She's received numerous CMA and ACM awards, plus lifetime achievement honors from major music organizations.
- She's received honorary degrees and civic honors for her cultural and philanthropic impact.
- Her butterfly is her signature symbol — free, gentle, and never hurting a soul.
`.trim()

export function buildSystemPrompt(appName: string, _schemas: CollectionSchema[]): string {
  return [
    `You speak ABOUT Dolly Parton for "${appName}", an unofficial fan tribute site.`,
    'You are never Dolly and never speak in her voice or first person as her —',
    'you are a warm, knowledgeable guide describing her life, music, and legacy.',
    '',
    'Answer using the fact sheet below. Stick to well-established public facts;',
    'never invent details, never quote song lyrics or interviews verbatim, and',
    'never state an uncertain claim as settled fact.',
    '',
    'Decline gossip or speculation about her private life, relationships,',
    'health, finances, or anything else not covered by the fact sheet — say',
    "you don't go into that, and offer to talk about her music or work instead.",
    '',
    'Keep every answer to 2-4 sentences: sincere, a little playful, never',
    'saccharine. If someone asks about something unrelated to Dolly, gently',
    'steer the conversation back to her.',
    '',
    'This app also has a tribute wall ("tributes") and a quiz leaderboard',
    '("scores") the tools below can query — use them only to answer questions',
    "about this fan site's own wall or leaderboard (e.g. \"how many tributes",
    'are there\", \"what\'s the top quiz score\"), never to look anything up about',
    'the real Dolly Parton. Never create, update, or delete a record unless the',
    'signed-in user explicitly asks you to edit THEIR OWN tribute — and even',
    'then, confirm what you\'re about to change before doing it.',
    '',
    'Dolly Parton fact sheet:',
    DOLLY_FACT_SHEET,
  ].join('\n')
}

// ============================================================================
// Tool definitions
// ============================================================================

export function buildTools(executor: ToolExecutor): ToolSet {
  const tools: ToolSet = {}

  for (const def of BUILT_IN_TOOLS) {
    if (!ALLOWED_TOOL_NAMES.includes(def.name)) continue
    const safeName = def.name.replace('.', '_')
    tools[safeName] = tool({
      description: def.description,
      inputSchema: buildZodSchema(def),
      // Apply assistant-only param defaults (e.g. records.query page size) here
      // in the AI tool layer, so internal record readers that hit the tools
      // dispatch directly stay unbounded.
      execute: async (params: Record<string, unknown>) =>
        executor(def.name, applyAiToolDefaults(def.name, params)),
    })
  }

  return tools
}

// ============================================================================
// Convert ToolSchema params → Zod object schema
// ============================================================================

function buildZodSchema(def: ToolSchema) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const [name, param] of Object.entries(def.params)) {
    let s: z.ZodTypeAny
    switch (param.type) {
      case 'string':  s = z.string(); break
      case 'number':  s = z.number(); break
      case 'boolean': s = z.boolean(); break
      case 'object':  s = z.record(z.string(), z.unknown()); break
      case 'array':   s = z.array(z.unknown()); break
      default:        s = z.unknown(); break
    }
    if (param.description) s = s.describe(param.description)
    if (!param.required) s = s.optional()
    shape[name] = s
  }

  return z.object(shape)
}
