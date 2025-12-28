import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query, Headers } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { TaskStatus } from './entities/task.entity';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { Permission } from '../permissions/decorators/permission.decorator';
import { GetUser } from '../auth/user/user.decorator';
import { User } from '../auth/user/user.entity';
import { OR, Owner } from '@libs/common';
import { TaskPermissions } from './tasks.permissions';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Post()
    @Permission(TaskPermissions.CREATE)
    create(
        @Body() createTaskDto: CreateTaskDto,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.tasksService.create(createTaskDto, user, organizationId);
    }

    @Get()
    @Permission(TaskPermissions.READ)
    findAll(
        @GetUser() user: User,
        @Query('status') status?: TaskStatus,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        if (status) {
            return this.tasksService.findByStatus(status, user, organizationId);
        }
        return this.tasksService.findAll(user, organizationId);
    }

    @Get('my-tasks')
    @Permission(TaskPermissions.READ)
    findMyTasks(
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.tasksService.findMyTasks(user, organizationId);
    }

    @Get('overdue')
    @Permission(TaskPermissions.READ)
    findOverdue(
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.tasksService.findOverdue(user, organizationId);
    }

    @Get(':id')
    @Permission(OR(Owner, TaskPermissions.READ))
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.tasksService.findOne(id, user, organizationId);
    }

    @Patch(':id')
    @Permission(OR(Owner, TaskPermissions.UPDATE))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateTaskDto: UpdateTaskDto,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.tasksService.update(id, updateTaskDto, user, organizationId);
    }

    @Patch(':id/complete')
    @Permission(OR(Owner, TaskPermissions.COMPLETE))
    complete(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.tasksService.completeTask(id, user, organizationId);
    }

    @Delete(':id')
    @Permission(OR(Owner, TaskPermissions.DELETE))
    remove(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.tasksService.remove(id, user, organizationId);
    }
}
