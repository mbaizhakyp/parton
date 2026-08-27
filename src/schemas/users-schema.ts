import { USERS_COLUMNS, type CollectionSchema } from 'deepspace/schema'

export const usersSchema: CollectionSchema = {
  name: 'users',
  columns: [...USERS_COLUMNS],
  permissions: {
    // Clients never write users rows directly: name/email/role/imageUrl are
    // SYSTEM_ASSIGNED (worker refuses the write regardless of permissions).
    // Renames go through the setDisplayName action → registerUser.
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: true, create: false, update: true, delete: true },
  },
}
