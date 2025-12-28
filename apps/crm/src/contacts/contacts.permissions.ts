import { registerModulePermissions } from '@libs/common';

export const ContactPermissions = {
  READ: 'contact:read',
  CREATE: 'contact:create',
  UPDATE: 'contact:update',
  DELETE: 'contact:delete',
} as const;

// Register with the global permission system
registerModulePermissions('Contact', ContactPermissions);

export type ContactPermission = typeof ContactPermissions[keyof typeof ContactPermissions];
