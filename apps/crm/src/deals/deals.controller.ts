import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto } from './dto';
import { DealStage } from './entities/deal.entity';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { Permission } from '../permissions/decorators/permission.decorator';
import { GetUser } from '../auth/user/user.decorator';
import { User } from '../auth/user/user.entity';
import { OR, Owner } from '@libs/common';
import { DealPermissions } from './deals.permissions';

@Controller('deals')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DealsController {
    constructor(private readonly dealsService: DealsService) {}

    @Post()
    @Permission(DealPermissions.CREATE)
    create(@Body() createDealDto: CreateDealDto, @GetUser() user: User) {
        return this.dealsService.create(createDealDto, user);
    }

    @Get()
    @Permission(DealPermissions.READ)
    findAll(@GetUser() user: User, @Query('stage') stage?: DealStage) {
        if (stage) {
            return this.dealsService.findByStage(stage, user);
        }
        return this.dealsService.findAll(user);
    }

    @Get('pipeline')
    @Permission(DealPermissions.READ)
    getPipeline(@GetUser() user: User) {
        return this.dealsService.getDealsPipeline(user);
    }

    @Get(':id')
    @Permission(OR(Owner, DealPermissions.READ))
    findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
        return this.dealsService.findOne(id, user);
    }

    @Patch(':id')
    @Permission(OR(Owner, DealPermissions.UPDATE))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDealDto: UpdateDealDto,
        @GetUser() user: User,
    ) {
        return this.dealsService.update(id, updateDealDto, user);
    }

    @Delete(':id')
    @Permission(OR(Owner, DealPermissions.DELETE))
    remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
        return this.dealsService.remove(id, user);
    }
}
