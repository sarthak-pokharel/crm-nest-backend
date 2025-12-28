import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role, UserRole, RolePermission } from './entities';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';
import { PermissionsService } from './services/permissions.service';
import { CaslAbilityFactory } from './casl/casl-ability.factory';
import { PermissionGuard } from './guards/permission.guard';
import { UserPermissionsController } from './controllers/user-permissions.controller';
import { RolesController } from './controllers/roles.controller';
import {
    IPermissionReader,
    IPermissionWriter,
    IRoleManager,
    IPermissionsService,
    IAbilityFactory,
} from './interfaces';
@Module({
    imports: [TypeOrmModule.forFeature([Role, UserRole, RolePermission, UserOrganizationRole])],
    providers: [
        PermissionsService,
        {
            provide: IPermissionReader,
            useExisting: PermissionsService,
        },
        {
            provide: IPermissionWriter,
            useExisting: PermissionsService,
        },
        {
            provide: IRoleManager,
            useExisting: PermissionsService,
        },
        {
            provide: IPermissionsService,
            useExisting: PermissionsService,
        },
        CaslAbilityFactory,
        {
            provide: IAbilityFactory,
            useExisting: CaslAbilityFactory,
        },
        PermissionGuard,
    ],
    controllers: [UserPermissionsController, RolesController],
    exports: [
        IPermissionsService,
        IPermissionReader,
        IPermissionWriter,
        IRoleManager,
        IAbilityFactory,
        PermissionGuard,
    ],
})
export class PermissionsModule { }
