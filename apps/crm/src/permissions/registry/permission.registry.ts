
export interface PermissionDefinition {
    key: string;
    resource: string;
    action: string;
    description?: string;
}

export interface ResourcePermissions {
    [action: string]: string;
}

export class PermissionRegistry {
    private static instance: PermissionRegistry;
    private permissionMap = new Map<string, PermissionDefinition>();
    private resourceMap = new Map<string, ResourcePermissions>();

    private constructor() {
        // Initialize with base permissions from libs/common
        this.initializeBasePermissions();
    }

    static getInstance(): PermissionRegistry {
        if (!PermissionRegistry.instance) {
            PermissionRegistry.instance = new PermissionRegistry();
        }
        return PermissionRegistry.instance;
    }


    registerResource(resourceName: string, permissions: ResourcePermissions): void {
        const lowercaseResource = resourceName.toLowerCase();

        if (this.resourceMap.has(lowercaseResource)) {
            console.warn(`Resource "${resourceName}" is already registered. Merging permissions.`);
            const existing = this.resourceMap.get(lowercaseResource)!;
            this.resourceMap.set(lowercaseResource, { ...existing, ...permissions });
        } else {
            this.resourceMap.set(lowercaseResource, permissions);
        }

        Object.entries(permissions).forEach(([action, key]) => {
            const [resource, act] = key.split(':');
            this.permissionMap.set(key, {
                key,
                resource: resource || resourceName,
                action: act || action,
            });
        });
    }

    getResourcePermissions(resourceName: string): ResourcePermissions | undefined {
        return this.resourceMap.get(resourceName.toLowerCase());
    }

    getAllPermissionKeys(): string[] {
        return Array.from(this.permissionMap.keys());
    }

    getPermission(key: string): PermissionDefinition | undefined {
        return this.permissionMap.get(key);
    }
    hasPermission(key: string): boolean {
        return this.permissionMap.has(key);
    }

    getRegisteredResources(): string[] {
        return Array.from(this.resourceMap.keys());
    }

    clear(): void {
        this.permissionMap.clear();
        this.resourceMap.clear();
    }

    private initializeBasePermissions(): void {

        try {
            const { Permissions } = require('@libs/common');

            Object.entries(Permissions).forEach(([resourceName, permissions]) => {
                this.registerResource(resourceName, permissions as ResourcePermissions);
            });
        } catch (error) {
            console.warn('Could not load base permissions from @libs/common:', error);
        }
    }
}
export const permissionRegistry = PermissionRegistry.getInstance();
