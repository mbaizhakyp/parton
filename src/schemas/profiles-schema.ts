import type { CollectionSchema } from 'deepspace/schema'

/**
 * App-owned display names, keyed by userId (one row per user, seeded by the
 * setDisplayName action with an explicit recordId). Exists because
 * users.name is a platform mirror of the auth-provider name — the SDK
 * re-stamps it on every WS connect, so a custom name can't live there.
 * Written ONLY via the setDisplayName action; clients just read their row.
 */
export const profilesSchema: CollectionSchema = {
  name: 'profiles',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', required: true, userBound: true, immutable: true },
    { name: 'displayName', storage: 'text', interpretation: 'plain', required: true },
  ],
  ownerField: 'userId',
  permissions: {
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
