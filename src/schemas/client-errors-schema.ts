/**
 * Client Errors — Schema
 *
 * The admin-reviewable half of error reporting. The SDK's own reporter
 * (installClientErrorReporter → registerClientErrorRoute) already forwards
 * every uncaught browser error to Workers Logs (`deepspace logs`, tagged
 * CLIENT) — including for signed-out visitors. This collection additionally
 * captures signed-in users' errors as records so the /admin page can list,
 * review, and mark them fixed.
 *
 * ponytail: signed-out visitors' errors land only in Workers Logs, not here —
 * records need a role to create. Acceptable: the admin UI covers the users
 * the owner can actually follow up with.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const clientErrorsSchema: CollectionSchema = {
  name: 'client_errors',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'userName', storage: 'text', interpretation: 'plain' },
    { name: 'message', storage: 'text', interpretation: 'plain', required: true },
    { name: 'stack', storage: 'text', interpretation: 'plain' },
    { name: 'context', storage: 'text', interpretation: 'plain' },
    { name: 'userAgent', storage: 'text', interpretation: 'plain' },
    // new -> reviewed -> fixed, driven from the admin page.
    { name: 'status', storage: 'text', interpretation: 'plain', default: 'new' },
  ],
  ownerField: 'userId',
  permissions: {
    // Members write error reports but can never read the log or touch status.
    member: {
      read: false,
      create: true,
      update: false,
      delete: false,
      writableFields: ['userName', 'message', 'stack', 'context', 'userAgent'],
    },
    viewer: { read: false, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
