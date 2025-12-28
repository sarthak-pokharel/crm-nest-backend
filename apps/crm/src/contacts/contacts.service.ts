import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto, UpdateContactDto } from './dto';
import { User } from '../auth/user/user.entity';

@Injectable()
export class ContactsService {
    constructor(
        @InjectRepository(Contact)
        private contactRepository: Repository<Contact>,
    ) {}

    async create(createContactDto: CreateContactDto, user: User): Promise<Contact> {
        const contact = this.contactRepository.create({
            ...createContactDto,
            ownerId: user.id,
        });
        return this.contactRepository.save(contact);
    }

    async findAll(user: User): Promise<Contact[]> {
        const queryBuilder = this.contactRepository.createQueryBuilder('contact');

        // Apply scope filtering
        if (user.companyId) {
            queryBuilder.andWhere('contact.companyId = :companyId', { companyId: user.companyId });
        }

        return queryBuilder
            .leftJoinAndSelect('contact.company', 'company')
            .where('contact.isActive = :isActive', { isActive: true })
            .orderBy('contact.createdAt', 'DESC')
            .getMany();
    }

    async findOne(id: number, user: User): Promise<Contact> {
        const contact = await this.contactRepository.findOne({ 
            where: { id },
            relations: ['company'],
        });
        
        if (!contact) {
            throw new NotFoundException(`Contact with ID ${id} not found`);
        }

        // Check scope access
        if (user.companyId && contact.companyId !== user.companyId) {
            throw new ForbiddenException('You do not have access to this contact');
        }

        return contact;
    }

    async findByCompany(companyId: number, user: User): Promise<Contact[]> {
        return this.contactRepository.find({
            where: { companyId, isActive: true },
            order: { isPrimary: 'DESC', createdAt: 'DESC' },
        });
    }

    async update(id: number, updateContactDto: UpdateContactDto, user: User): Promise<Contact> {
        const contact = await this.findOne(id, user);
        Object.assign(contact, updateContactDto);
        return this.contactRepository.save(contact);
    }

    async remove(id: number, user: User): Promise<void> {
        const contact = await this.findOne(id, user);
        contact.isActive = false;
        await this.contactRepository.save(contact);
    }
}
