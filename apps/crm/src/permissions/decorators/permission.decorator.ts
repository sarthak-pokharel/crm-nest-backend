import { SetMetadata } from '@nestjs/common';
import { PermissionRequirement, Owner } from '@libs/common';

export const PERMISSIONS_KEY = 'permissions';
export const CHECK_OWNERSHIP_KEY = 'check_ownership';

export const Permission = (...requirements: (PermissionRequirement | string | typeof Owner)[]) => {
    const normalized = requirements.map(req => {
        if (req === Owner) {
            return { checkOwnership: true };
        }
        if (typeof req === 'string') {
            return { permissions: [req] };
        }
        return req;
    });

    return SetMetadata(PERMISSIONS_KEY, normalized);
};
