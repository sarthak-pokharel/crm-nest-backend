import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deal, DealStage } from './entities/deal.entity';
import { CreateDealDto, UpdateDealDto } from './dto';
import { User } from '../auth/user/user.entity';

@Injectable()
export class DealsService {
    constructor(
        @InjectRepository(Deal)
        private dealRepository: Repository<Deal>,
    ) {}

    async create(createDealDto: CreateDealDto, user: User): Promise<Deal> {
        const deal = this.dealRepository.create({
            ...createDealDto,
            ownerId: user.id,
            assignedToId: createDealDto.assignedToId || user.id,
        });
        return this.dealRepository.save(deal);
    }

    async findAll(user: User): Promise<Deal[]> {
        const queryBuilder = this.dealRepository.createQueryBuilder('deal');

        // Apply scope filtering
        if (user.companyId) {
            queryBuilder.andWhere('deal.companyId = :companyId', { companyId: user.companyId });
        }

        return queryBuilder
            .leftJoinAndSelect('deal.company', 'company')
            .leftJoinAndSelect('deal.contact', 'contact')
            .where('deal.isActive = :isActive', { isActive: true })
            .orderBy('deal.createdAt', 'DESC')
            .getMany();
    }

    async findOne(id: number, user: User): Promise<Deal> {
        const deal = await this.dealRepository.findOne({ 
            where: { id },
            relations: ['company', 'contact'],
        });
        
        if (!deal) {
            throw new NotFoundException(`Deal with ID ${id} not found`);
        }

        // Check scope access
        if (user.companyId && deal.companyId !== user.companyId) {
            throw new ForbiddenException('You do not have access to this deal');
        }

        return deal;
    }

    async findByStage(stage: DealStage, user: User): Promise<Deal[]> {
        const queryBuilder = this.dealRepository.createQueryBuilder('deal')
            .where('deal.stage = :stage', { stage })
            .andWhere('deal.isActive = :isActive', { isActive: true });

        // Apply scope filtering
        if (user.companyId) {
            queryBuilder.andWhere('deal.companyId = :companyId', { companyId: user.companyId });
        }

        return queryBuilder
            .leftJoinAndSelect('deal.company', 'company')
            .leftJoinAndSelect('deal.contact', 'contact')
            .orderBy('deal.createdAt', 'DESC')
            .getMany();
    }

    async update(id: number, updateDealDto: UpdateDealDto, user: User): Promise<Deal> {
        const deal = await this.findOne(id, user);

        // Auto-set actualCloseDate when deal is closed
        if (updateDealDto.stage === DealStage.CLOSED_WON || updateDealDto.stage === DealStage.CLOSED_LOST) {
            if (!updateDealDto.actualCloseDate) {
                updateDealDto.actualCloseDate = new Date().toISOString();
            }
        }

        Object.assign(deal, updateDealDto);
        return this.dealRepository.save(deal);
    }

    async remove(id: number, user: User): Promise<void> {
        const deal = await this.findOne(id, user);
        deal.isActive = false;
        await this.dealRepository.save(deal);
    }

    async getDealsPipeline(user: User): Promise<any> {
        const queryBuilder = this.dealRepository.createQueryBuilder('deal')
            .where('deal.isActive = :isActive', { isActive: true });

        if (user.companyId) {
            queryBuilder.andWhere('deal.companyId = :companyId', { companyId: user.companyId });
        }

        const deals = await queryBuilder.getMany();

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
