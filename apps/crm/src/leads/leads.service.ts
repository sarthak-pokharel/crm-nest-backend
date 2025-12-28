import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity';
import { CreateLeadDto, UpdateLeadDto } from './dto';
import { User } from '../auth/user/user.entity';

@Injectable()
export class LeadsService {
    constructor(
        @InjectRepository(Lead)
        private leadRepository: Repository<Lead>,
    ) {}

    async create(createLeadDto: CreateLeadDto, user: User): Promise<Lead> {
        const lead = this.leadRepository.create({
            ...createLeadDto,
            ownerId: user.id,
            assignedToId: createLeadDto.assignedToId || user.id,
        });
        return this.leadRepository.save(lead);
    }

    async findAll(user: User): Promise<Lead[]> {
        const queryBuilder = this.leadRepository.createQueryBuilder('lead');

        // Apply scope filtering
        if (user.companyId) {
            queryBuilder.andWhere('lead.companyId = :companyId', { companyId: user.companyId });
        }
        if (user.departmentId) {
            queryBuilder.andWhere('lead.assignedToId IN (SELECT id FROM users WHERE departmentId = :departmentId)', 
                { departmentId: user.departmentId });
        }
        if (user.teamId) {
            queryBuilder.andWhere('lead.assignedToId IN (SELECT id FROM users WHERE teamId = :teamId)', 
                { teamId: user.teamId });
        }

        return queryBuilder
            .leftJoinAndSelect('lead.company', 'company')
            .orderBy('lead.createdAt', 'DESC')
            .getMany();
    }

    async findOne(id: number, user: User): Promise<Lead> {
        const lead = await this.leadRepository.findOne({ 
            where: { id },
            relations: ['company'],
        });
        
        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        // Check scope access
        if (user.companyId && lead.companyId !== user.companyId) {
            throw new ForbiddenException('You do not have access to this lead');
        }

        return lead;
    }

    async update(id: number, updateLeadDto: UpdateLeadDto, user: User): Promise<Lead> {
        const lead = await this.findOne(id, user);

        // Update lastContactedAt if status changes
        if (updateLeadDto.status && updateLeadDto.status !== lead.status) {
            lead.lastContactedAt = new Date();
        }

        Object.assign(lead, updateLeadDto);
        return this.leadRepository.save(lead);
    }

    async remove(id: number, user: User): Promise<void> {
        const lead = await this.findOne(id, user);
        await this.leadRepository.remove(lead);
    }

    async updateStatus(id: number, status: LeadStatus, user: User): Promise<Lead> {
        const lead = await this.findOne(id, user);
        lead.status = status;
        lead.lastContactedAt = new Date();
        return this.leadRepository.save(lead);
    }

    async getLeadsByStatus(status: LeadStatus, user: User): Promise<Lead[]> {
        const queryBuilder = this.leadRepository.createQueryBuilder('lead')
            .where('lead.status = :status', { status });

        // Apply scope filtering
        if (user.companyId) {
            queryBuilder.andWhere('lead.companyId = :companyId', { companyId: user.companyId });
        }

        return queryBuilder
            .leftJoinAndSelect('lead.company', 'company')
            .orderBy('lead.createdAt', 'DESC')
            .getMany();
    }
}
