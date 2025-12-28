import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './organization.entity';
import { UserOrganizationRole } from './user-organization-role.entity';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationInterceptor } from './organization.interceptor';
import { PermissionsModule } from '../../permissions/permissions.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Organization, UserOrganizationRole]),
        PermissionsModule,
    ],
    controllers: [OrganizationController],
    providers: [OrganizationService, OrganizationInterceptor],
    exports: [OrganizationService],
})
export class OrganizationModule { }
