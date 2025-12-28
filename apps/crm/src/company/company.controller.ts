import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Headers } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { Permission } from '../permissions/decorators/permission.decorator';
import { GetUser } from '../auth/user/user.decorator';
import { User } from '../auth/user/user.entity';
import { OR, Owner } from '@libs/common';
import { CompanyPermissions } from './company.permissions';

@Controller('companies')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CompanyController {
    constructor(private readonly companyService: CompanyService) {}

    @Post()
    @Permission(CompanyPermissions.CREATE)
    create(
        @Body() createCompanyDto: CreateCompanyDto,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.companyService.create(createCompanyDto, user, organizationId);
    }

    @Get()
    @Permission(CompanyPermissions.READ)
    findAll(@GetUser() user: User, @Headers('x-crm-org-id') orgIdHeader?: string) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.companyService.findAll(user, organizationId);
    }

    @Get(':id')
    @Permission(OR(Owner, CompanyPermissions.READ))
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.companyService.findOne(id, user, organizationId);
    }

    @Patch(':id')
    @Permission(OR(Owner, CompanyPermissions.UPDATE))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCompanyDto: UpdateCompanyDto,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.companyService.update(id, updateCompanyDto, user, organizationId);
    }

    @Delete(':id')
    @Permission(OR(Owner, CompanyPermissions.DELETE))
    remove(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.companyService.remove(id, user, organizationId);
    }
}
