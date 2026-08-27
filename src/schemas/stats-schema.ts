/**
 * Stats Feature - Schema
 *
 * Single-row site counters (currently just `fans`, the header pill's total
 * signed-up count). Written only by the ensureAdmin server action (bypasses
 * RBAC) — no role gets `create`/`update` here except admin's escape hatch.
 * Mirrors scores-schema's shape/comment style.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const statsSchema: CollectionSchema = {
  name: 'stats',
  columns: [{ name: 'fans', storage: 'number', interpretation: 'plain', required: true }],
  permissions: {
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
