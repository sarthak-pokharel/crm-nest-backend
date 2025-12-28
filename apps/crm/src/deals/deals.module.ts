import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { Deal } from './entities/deal.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';
import './deals.permissions';

@Module({
    imports: [
        TypeOrmModule.forFeature([Deal, UserOrganizationRole]),
        PermissionsModule,
    ],
    controllers: [DealsController],
    providers: [DealsService],
    exports: [DealsService],
})
export class DealsModule {}
