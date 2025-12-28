import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
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
    create(@Body() createLeadDto: CreateLeadDto, @GetUser() user: User) {
        return this.leadsService.create(createLeadDto, user);
    }

    @Get()
    @Permission(LeadPermissions.READ)
    findAll(@GetUser() user: User, @Query('status') status?: LeadStatus) {
        if (status) {
            return this.leadsService.getLeadsByStatus(status, user);
        }
        return this.leadsService.findAll(user);
    }

    @Get(':id')
    @Permission(OR(Owner, LeadPermissions.READ))
    findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
        return this.leadsService.findOne(id, user);
    }

    @Patch(':id')
    @Permission(OR(Owner, LeadPermissions.UPDATE))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateLeadDto: UpdateLeadDto,
        @GetUser() user: User,
    ) {
        return this.leadsService.update(id, updateLeadDto, user);
    }

    @Patch(':id/status')
    @Permission(OR(Owner, LeadPermissions.UPDATE))
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body('status') status: LeadStatus,
        @GetUser() user: User,
    ) {
        return this.leadsService.updateStatus(id, status, user);
    }

    @Delete(':id')
    @Permission(OR(Owner, LeadPermissions.DELETE))
    remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
        return this.leadsService.remove(id, user);
    }
}
