import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto, UpdateContactDto } from './dto';
import { User } from '../auth/user/user.entity';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';
import { TenantBaseService } from '../common/tenant-base.service';

@Injectable()
export class ContactsService extends TenantBaseService {
    constructor(
        @InjectRepository(Contact)
        private contactRepository: Repository<Contact>,
        @InjectRepository(UserOrganizationRole)
        protected userOrganizationRoleRepository: Repository<UserOrganizationRole>,
    ) {
        super(userOrganizationRoleRepository);
    }

    async create(createContactDto: CreateContactDto, user: User, contextOrgId?: number): Promise<Contact> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        const contact = this.contactRepository.create({
            ...createContactDto,
            createdById: user.id,
            organizationId,
        });
        return this.contactRepository.save(contact);
    }

    async findAll(user: User, contextOrgId?: number): Promise<Contact[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        return this.contactRepository.createQueryBuilder('contact')
            .leftJoinAndSelect('contact.company', 'company')
            .where('contact.isActive = :isActive', { isActive: true })
            .andWhere('contact.organizationId = :organizationId', { organizationId })
            .orderBy('contact.createdAt', 'DESC')
            .getMany();
    }

    async findOne(id: number, user: User, contextOrgId?: number): Promise<Contact> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        const contact = await this.contactRepository.findOne({ 
            where: { id, organizationId },
            relations: ['company'],
        });
        
        if (!contact) {
            throw new NotFoundException(`Contact with ID ${id} not found`);
        }

        return contact;
    }

    async findByCompany(companyId: number, user: User, contextOrgId?: number): Promise<Contact[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        return this.contactRepository.find({
            where: { companyId, organizationId, isActive: true },
            order: { isPrimary: 'DESC', createdAt: 'DESC' },
        });
    }

    async update(id: number, updateContactDto: UpdateContactDto, user: User, contextOrgId?: number): Promise<Contact> {
        const contact = await this.findOne(id, user, contextOrgId);
        Object.assign(contact, updateContactDto);
        return this.contactRepository.save(contact);
    }

    async remove(id: number, user: User, contextOrgId?: number): Promise<void> {
        const contact = await this.findOne(id, user, contextOrgId);
        contact.isActive = false;
        await this.contactRepository.save(contact);
    }
}
