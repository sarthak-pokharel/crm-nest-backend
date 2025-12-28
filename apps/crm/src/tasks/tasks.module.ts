import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';
import './tasks.permissions';

@Module({
    imports: [
        TypeOrmModule.forFeature([Task, UserOrganizationRole]),
        PermissionsModule,
    ],
    controllers: [TasksController],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule {}
