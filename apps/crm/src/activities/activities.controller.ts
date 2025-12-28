import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query, Headers } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, UpdateActivityDto } from './dto';
import { ActivityType, ActivityRelationType } from './entities/activity.entity';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { Permission } from '../permissions/decorators/permission.decorator';
import { GetUser } from '../auth/user/user.decorator';
import { User } from '../auth/user/user.entity';
import { OR, Owner } from '@libs/common';
import { ActivityPermissions } from './activities.permissions';

@Controller('activities')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) {}

    @Post()
    @Permission(ActivityPermissions.CREATE)
    create(
        @Body() createActivityDto: CreateActivityDto,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.activitiesService.create(createActivityDto, user, organizationId);
    }

    @Get()
    @Permission(ActivityPermissions.READ)
    findAll(
        @GetUser() user: User,
        @Query('type') type?: ActivityType,
        @Query('relationType') relationType?: ActivityRelationType,
        @Query('relationId') relationId?: string,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        if (type) {
            return this.activitiesService.findByType(type, user, organizationId);
        }
        if (relationType && relationId) {
            return this.activitiesService.findByRelation(relationType, parseInt(relationId), user, organizationId);
        }
        return this.activitiesService.findAll(user, organizationId);
    }

    @Get('upcoming')
    @Permission(ActivityPermissions.READ)
    getUpcoming(
        @GetUser() user: User,
        @Query('limit') limit?: string,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.activitiesService.getUpcoming(user, limit ? parseInt(limit) : 10, organizationId);
    }

    @Get(':id')
    @Permission(OR(Owner, ActivityPermissions.READ))
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.activitiesService.findOne(id, user, organizationId);
    }

    @Patch(':id')
    @Permission(OR(Owner, ActivityPermissions.UPDATE))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateActivityDto: UpdateActivityDto,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.activitiesService.update(id, updateActivityDto, user, organizationId);
    }

    @Delete(':id')
    @Permission(OR(Owner, ActivityPermissions.DELETE))
    remove(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.activitiesService.remove(id, user, organizationId);
    }
}
