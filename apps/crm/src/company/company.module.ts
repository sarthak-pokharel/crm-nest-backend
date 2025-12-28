import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { Company } from './entities/company.entity';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import './company.permissions';

@Module({
    imports: [
        TypeOrmModule.forFeature([Company, UserOrganizationRole]),
        PermissionsModule,
    ],
    controllers: [CompanyController],
    providers: [CompanyService],
    exports: [CompanyService],
})
export class CompanyModule {}
