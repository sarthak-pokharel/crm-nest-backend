import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Role } from './role.entity';

// Import PermissionScope locally to avoid TypeORM CLI path resolution issues
export enum PermissionScope {
    GLOBAL = 'global',
    COMPANY = 'company',
    DEPARTMENT = 'department',
    TEAM = 'team',
    SELF = 'self',
}

@Entity('role_permissions')
@Index(['roleId', 'permissionKey'], { unique: true })
export class RolePermission {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    roleId: number;

    // Permission key (e.g., 'lead:read', 'deal:approve')
    @Column()
    permissionKey: string;

    // Scope of the permission
    @Column({
        type: 'enum',
        enum: PermissionScope,
        default: PermissionScope.SELF,
    })
    scope: PermissionScope;

    // Optional: Additional conditions as JSON
    @Column({ type: 'jsonb', nullable: true })
    conditions: Record<string, any>;

    @ManyToOne(() => Role, role => role.rolePermissions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'roleId' })
    role: Role;

    @CreateDateColumn()
    createdAt: Date;
}
