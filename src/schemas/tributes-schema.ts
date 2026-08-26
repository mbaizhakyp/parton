/**
 * Tributes Feature - Schema
 *
 * Fan tributes to Dolly. Members write their own; a moderator can hide/pin
 * any tribute without touching its content or the author's sparkle count.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const tributesSchema: CollectionSchema = {
  name: 'tributes',
  columns: [
    { name: 'authorId', storage: 'text', interpretation: 'plain', required: true, userBound: true, immutable: true },
    { name: 'authorName', storage: 'text', interpretation: 'plain', required: true },
    { name: 'body', storage: 'text', interpretation: 'plain', required: true },
    { name: 'place', storage: 'text', interpretation: 'plain' },
    { name: 'year', storage: 'text', interpretation: 'plain' },
    { name: 'sparkles', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'hidden', storage: 'number', interpretation: { kind: 'boolean' }, default: false },
    { name: 'pinned', storage: 'number', interpretation: { kind: 'boolean' }, default: false },
  ],
  ownerField: 'authorId',
  // Boolean columns store raw 0/1 in `.data` at permission-check time, so the
  // gate value must be 0, not false.
  visibilityField: { field: 'hidden', value: 0 },
  permissions: {
    // '*' is the signed-out wildcard (no 'anonymous' role exists) — required
    // for F1's "visitor reads the wall" acceptance criterion. Schemas bake in
    // at deploy time, so this takes effect on the next `deepspace deploy`.
    '*': { read: 'published', create: false, update: false, delete: false },
    viewer: { read: 'published', create: false, update: false, delete: false },
    member: {
      read: 'published',
      create: true,
      update: 'own',
      delete: 'own',
      writableFields: ['authorName', 'body', 'place', 'year'],
    },
    // ponytail: one role per user, so moderators curate but can't post or edit
    // tribute text — the alternative (update:true with text fields writable)
    // would let mods rewrite anyone's memory. Revisit only if mods must post.
    moderator: {
      read: true,
      create: false,
      update: true,
      delete: false,
      writableFields: ['hidden', 'pinned'],
    },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
