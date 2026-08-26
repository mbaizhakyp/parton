import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'

interface TributeRecord {
  sparkles?: number
}

export const actions: Record<string, ActionHandler<Env>> = {
  /**
   * Increments a tribute's sparkle count. A server action (not a plain
   * `put`) because any signed-in member may sparkle *any* tribute, while the
   * tributes schema only grants `update: 'own'` to members.
   */
  addSparkle: async ({ params, tools }) => {
    const tributeId = params.tributeId
    if (typeof tributeId !== 'string' || !tributeId) {
      return { success: false, error: 'Missing tributeId' }
    }

    const existing = await tools.get('tributes', tributeId)
    if (!existing.success) return existing

    const { record } = existing.data as { record: { data: TributeRecord } }
    const current = record.data.sparkles ?? 0

    // ponytail: read-then-write, not an atomic increment — this SDK has no
    // atomic increment primitive. Two sparkles landing in the same instant
    // can clobber one another and undercount by one. Accepted ceiling for a
    // fan-tribute counter; upgrade to a DO-side atomic op if one ships.
    return tools.update('tributes', tributeId, { sparkles: current + 1 })
  },
}
