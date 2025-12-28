import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deal, DealStage } from './entities/deal.entity';
import { CreateDealDto, UpdateDealDto } from './dto';
import { User } from '../auth/user/user.entity';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';
import { TenantBaseService } from '../common/tenant-base.service';

@Injectable()
export class DealsService extends TenantBaseService {
    constructor(
        @InjectRepository(Deal)
        private dealRepository: Repository<Deal>,
        @InjectRepository(UserOrganizationRole)
        protected userOrganizationRoleRepository: Repository<UserOrganizationRole>,
    ) {
        super(userOrganizationRoleRepository);
    }

    async create(createDealDto: CreateDealDto, user: User, contextOrgId?: number): Promise<Deal> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        const deal = this.dealRepository.create({
            ...createDealDto,
            createdById: user.id,
            organizationId,
            assignedToId: createDealDto.assignedToId || user.id,
        });
        return this.dealRepository.save(deal);
    }

    async findAll(user: User, contextOrgId?: number): Promise<Deal[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        return this.dealRepository.createQueryBuilder('deal')
            .leftJoinAndSelect('deal.company', 'company')
            .leftJoinAndSelect('deal.contact', 'contact')
            .where('deal.isActive = :isActive', { isActive: true })
            .andWhere('deal.organizationId = :organizationId', { organizationId })
            .orderBy('deal.createdAt', 'DESC')
            .getMany();
    }

    async findOne(id: number, user: User, contextOrgId?: number): Promise<Deal> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        const deal = await this.dealRepository.findOne({ 
            where: { id, organizationId },
            relations: ['company', 'contact'],
        });
        
        if (!deal) {
            throw new NotFoundException(`Deal with ID ${id} not found`);
        }

        return deal;
    }

    async findByStage(stage: DealStage, user: User, contextOrgId?: number): Promise<Deal[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        return this.dealRepository.createQueryBuilder('deal')
            .leftJoinAndSelect('deal.company', 'company')
            .leftJoinAndSelect('deal.contact', 'contact')
            .where('deal.stage = :stage', { stage })
            .andWhere('deal.isActive = :isActive', { isActive: true })
            .andWhere('deal.organizationId = :organizationId', { organizationId })
            .orderBy('deal.createdAt', 'DESC')
            .getMany();
    }

    async update(id: number, updateDealDto: UpdateDealDto, user: User, contextOrgId?: number): Promise<Deal> {
        const deal = await this.findOne(id, user, contextOrgId);

        // Auto-set actualCloseDate when deal is closed
        if (updateDealDto.stage === DealStage.CLOSED_WON || updateDealDto.stage === DealStage.CLOSED_LOST) {
            if (!updateDealDto.actualCloseDate) {
                updateDealDto.actualCloseDate = new Date().toISOString();
            }
        }

        Object.assign(deal, updateDealDto);
        return this.dealRepository.save(deal);
    }

    async remove(id: number, user: User, contextOrgId?: number): Promise<void> {
        const deal = await this.findOne(id, user, contextOrgId);
        deal.isActive = false;
        await this.dealRepository.save(deal);
    }

    async getDealsPipeline(user: User, contextOrgId?: number): Promise<any> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        const deals = await this.dealRepository.find({
            where: { isActive: true, organizationId },
        });

        // Group by stage
        const pipeline = Object.values(DealStage).map(stage => ({
            stage,
            count: deals.filter(d => d.stage === stage).length,
            totalValue: deals
                .filter(d => d.stage === stage)
                .reduce((sum, d) => sum + Number(d.value), 0),
        }));

        return {
            pipeline,
            totalDeals: deals.length,
            totalValue: deals.reduce((sum, d) => sum + Number(d.value), 0),
            avgDealValue: deals.length > 0 ? deals.reduce((sum, d) => sum + Number(d.value), 0) / deals.length : 0,
        };
    }
}
