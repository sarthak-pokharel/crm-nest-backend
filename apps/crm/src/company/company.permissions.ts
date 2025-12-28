import { registerModulePermissions } from '@libs/common';

export const CompanyPermissions = {
  READ: 'company:read',
  CREATE: 'company:create',
  UPDATE: 'company:update',
  DELETE: 'company:delete',
} as const;

// Register with the global permission system
registerModulePermissions('Company', CompanyPermissions);

export type CompanyPermission = typeof CompanyPermissions[keyof typeof CompanyPermissions];
