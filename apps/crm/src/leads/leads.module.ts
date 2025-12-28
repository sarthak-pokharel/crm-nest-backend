import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { Lead } from './entities/lead.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';
import './leads.permissions';

@Module({
    imports: [
        TypeOrmModule.forFeature([Lead, UserOrganizationRole]),
        PermissionsModule,
    ],
    controllers: [LeadsController],
    providers: [LeadsService],
    exports: [LeadsService],
})
export class LeadsModule {}
