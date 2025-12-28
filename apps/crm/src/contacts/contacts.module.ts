import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { Contact } from './entities/contact.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';
import './contacts.permissions';

@Module({
    imports: [
        TypeOrmModule.forFeature([Contact, UserOrganizationRole]),
        PermissionsModule,
    ],
    controllers: [ContactsController],
    providers: [ContactsService],
    exports: [ContactsService],
})
export class ContactsModule {}
