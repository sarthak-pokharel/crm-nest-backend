import { ModuleMetadata, Type } from '@nestjs/common';
import { permissionRegistry, ResourcePermissions } from '../registry';
export interface IPermissionPlugin {
    readonly name: string;
    registerPermissions(): void;
    validatePermission?(permissionKey: string): boolean;
}
export abstract class PermissionPlugin implements IPermissionPlugin {
    abstract readonly name: string;
    protected registerResource(resourceName: string, permissions: ResourcePermissions): void {
        permissionRegistry.registerResource(resourceName, permissions);
    }
    abstract registerPermissions(): void;
    validatePermission?(permissionKey: string): boolean;
}
export function PermissionPluginDecorator(name: string) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            readonly name = name;
        };
    };
}
export class PermissionPluginManager {
    private static instance: PermissionPluginManager;
    private plugins = new Map<string, IPermissionPlugin>();
    private constructor() { }
    static getInstance(): PermissionPluginManager {
        if (!PermissionPluginManager.instance) {
            PermissionPluginManager.instance = new PermissionPluginManager();
        }
        return PermissionPluginManager.instance;
    }
    registerPlugin(plugin: IPermissionPlugin): void {
        if (this.plugins.has(plugin.name)) {
            console.warn(`Plugin "${plugin.name}" is already registered.`);
            return;
        }
        this.plugins.set(plugin.name, plugin);
        plugin.registerPermissions();
        console.log(`✓ Permission plugin registered: ${plugin.name}`);
    }
    getPlugin(name: string): IPermissionPlugin | undefined {
        return this.plugins.get(name);
    }
    getAllPlugins(): IPermissionPlugin[] {
        return Array.from(this.plugins.values());
    }
    unregisterPlugin(name: string): boolean {
        return this.plugins.delete(name);
    }
    clear(): void {
        this.plugins.clear();
    }
}
export const pluginManager = PermissionPluginManager.getInstance();
