import { registerModulePermissions } from '@libs/common';

export const TaskPermissions = {
  READ: 'task:read',
  CREATE: 'task:create',
  UPDATE: 'task:update',
  DELETE: 'task:delete',
  ASSIGN: 'task:assign',
  COMPLETE: 'task:complete',
} as const;

// Register with the global permission system
registerModulePermissions('Task', TaskPermissions);

export type TaskPermission = typeof TaskPermissions[keyof typeof TaskPermissions];
