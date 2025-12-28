import { registerModulePermissions } from '@libs/common';

export const ActivityPermissions = {
  READ: 'activity:read',
  CREATE: 'activity:create',
  UPDATE: 'activity:update',
  DELETE: 'activity:delete',
} as const;

// Register with the global permission system
registerModulePermissions('Activity', ActivityPermissions);

export type ActivityPermission = typeof ActivityPermissions[keyof typeof ActivityPermissions];
