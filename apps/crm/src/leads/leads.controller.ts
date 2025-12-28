import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query, Headers } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto } from './dto';
import { LeadStatus } from './entities/lead.entity';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { Permission } from '../permissions/decorators/permission.decorator';
import { GetUser } from '../auth/user/user.decorator';
import { User } from '../auth/user/user.entity';
import { OR, Owner } from '@libs/common';
import { LeadPermissions } from './leads.permissions';

@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) {}

    @Post()
    @Permission(LeadPermissions.CREATE)
    create(
        @Body() createLeadDto: CreateLeadDto,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.leadsService.create(createLeadDto, user, organizationId);
    }

    @Get()
    @Permission(LeadPermissions.READ)
    findAll(
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
        @Query('status') status?: LeadStatus,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        if (status) {
            return this.leadsService.getLeadsByStatus(status, user, organizationId);
        }
        return this.leadsService.findAll(user, organizationId);
    }

    @Get(':id')
    @Permission(OR(Owner, LeadPermissions.READ))
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.leadsService.findOne(id, user, organizationId);
    }

    @Patch(':id')
    @Permission(OR(Owner, LeadPermissions.UPDATE))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateLeadDto: UpdateLeadDto,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.leadsService.update(id, updateLeadDto, user, organizationId);
    }

    @Patch(':id/status')
    @Permission(OR(Owner, LeadPermissions.UPDATE))
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body('status') status: LeadStatus,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.leadsService.updateStatus(id, status, user, organizationId);
    }

    @Delete(':id')
    @Permission(OR(Owner, LeadPermissions.DELETE))
    remove(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.leadsService.remove(id, user, organizationId);
    }
}
