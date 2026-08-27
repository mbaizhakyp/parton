/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { tributesSchema } from './schemas/tributes-schema'
import { scoresSchema } from './schemas/scores-schema'
import { clientErrorsSchema } from './schemas/client-errors-schema'
import { statsSchema } from './schemas/stats-schema'

import { aiChatSchemas } from './schemas/ai-chat-schema'

export const schemas: CollectionSchema[] = [
  ...aiChatSchemas,
  usersSchema,
  settingsSchema,
  tributesSchema,
  scoresSchema,
  clientErrorsSchema,
  statsSchema,
]
