import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query, Headers } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { Permission } from '../permissions/decorators/permission.decorator';
import { GetUser } from '../auth/user/user.decorator';
import { User } from '../auth/user/user.entity';
import { OR, Owner } from '@libs/common';
import { ContactPermissions } from './contacts.permissions';

@Controller('contacts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) {}

    @Post()
    @Permission(ContactPermissions.CREATE)
    create(
        @Body() createContactDto: CreateContactDto,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.contactsService.create(createContactDto, user, organizationId);
    }

    @Get()
    @Permission(ContactPermissions.READ)
    findAll(
        @GetUser() user: User,
        @Query('companyId') companyId?: string,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        if (companyId) {
            return this.contactsService.findByCompany(parseInt(companyId), user, organizationId);
        }
        return this.contactsService.findAll(user, organizationId);
    }

    @Get(':id')
    @Permission(OR(Owner, ContactPermissions.READ))
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.contactsService.findOne(id, user, organizationId);
    }

    @Patch(':id')
    @Permission(OR(Owner, ContactPermissions.UPDATE))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateContactDto: UpdateContactDto,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.contactsService.update(id, updateContactDto, user, organizationId);
    }

    @Delete(':id')
    @Permission(OR(Owner, ContactPermissions.DELETE))
    remove(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User,
        @Headers('x-crm-org-id') orgIdHeader?: string,
    ) {
        const organizationId = orgIdHeader ? parseInt(orgIdHeader, 10) : undefined;
        return this.contactsService.remove(id, user, organizationId);
    }
}
