import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { Activity } from './entities/activity.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';
import './activities.permissions';

@Module({
    imports: [
        TypeOrmModule.forFeature([Activity, UserOrganizationRole]),
        PermissionsModule,
    ],
    controllers: [ActivitiesController],
    providers: [ActivitiesService],
    exports: [ActivitiesService],
})
export class ActivitiesModule {}
