/**
 * Scores Feature - Schema
 *
 * Trivia leaderboard. Rows are written only by a server action (bypasses
 * RBAC) - no role gets `create` or `update` here except admin's escape hatch.
 * '*' (signed-out) gets read too - F2's leaderboard is visible to visitors,
 * only playing the quiz requires sign-in.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const scoresSchema: CollectionSchema = {
  name: 'scores',
  columns: [
    { name: 'playerName', storage: 'text', interpretation: 'plain', required: true },
    { name: 'score', storage: 'number', interpretation: 'plain', required: true },
    { name: 'total', storage: 'number', interpretation: 'plain', required: true },
    { name: 'takenAt', storage: 'text', interpretation: 'plain', required: true },
  ],
  permissions: {
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
