import { registerModulePermissions } from '@libs/common';

export const DealPermissions = {
  READ: 'deal:read',
  CREATE: 'deal:create',
  UPDATE: 'deal:update',
  DELETE: 'deal:delete',
  APPROVE: 'deal:approve',
  CLOSE: 'deal:close',
} as const;

// Register with the global permission system
registerModulePermissions('Deal', DealPermissions);

export type DealPermission = typeof DealPermissions[keyof typeof DealPermissions];
