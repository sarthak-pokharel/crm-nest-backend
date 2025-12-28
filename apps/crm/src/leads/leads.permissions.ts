import { registerModulePermissions } from '@libs/common';

export const LeadPermissions = {
  READ: 'lead:read',
  CREATE: 'lead:create',
  UPDATE: 'lead:update',
  DELETE: 'lead:delete',
  ASSIGN: 'lead:assign',
} as const;

// Register with the global permission system
registerModulePermissions('Lead', LeadPermissions);

export type LeadPermission = typeof LeadPermissions[keyof typeof LeadPermissions];
