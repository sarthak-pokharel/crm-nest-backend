import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity, ActivityType, ActivityRelationType } from './entities/activity.entity';
import { CreateActivityDto, UpdateActivityDto } from './dto';
import { User } from '../auth/user/user.entity';

@Injectable()
export class ActivitiesService {
    constructor(
        @InjectRepository(Activity)
        private activityRepository: Repository<Activity>,
    ) {}

    async create(createActivityDto: CreateActivityDto, user: User): Promise<Activity> {
        const activity = this.activityRepository.create({
            ...createActivityDto,
            userId: user.id,
            companyId: user.companyId,
        });
        return this.activityRepository.save(activity);
    }

    async findAll(user: User): Promise<Activity[]> {
        const queryBuilder = this.activityRepository.createQueryBuilder('activity');

        // Apply scope filtering
        if (user.companyId) {
            queryBuilder.andWhere('activity.companyId = :companyId', { companyId: user.companyId });
        }

        return queryBuilder
            .orderBy('activity.activityDate', 'DESC')
            .addOrderBy('activity.createdAt', 'DESC')
            .getMany();
    }

    async findOne(id: number, user: User): Promise<Activity> {
        const activity = await this.activityRepository.findOne({ where: { id } });
        
        if (!activity) {
            throw new NotFoundException(`Activity with ID ${id} not found`);
        }

        // Check scope access
        if (user.companyId && activity.companyId !== user.companyId) {
            throw new ForbiddenException('You do not have access to this activity');
        }

        return activity;
    }

    async findByRelation(relationType: ActivityRelationType, relationId: number, user: User): Promise<Activity[]> {
        const queryBuilder = this.activityRepository.createQueryBuilder('activity')
            .where('activity.relationType = :relationType', { relationType })
            .andWhere('activity.relationId = :relationId', { relationId });

        if (user.companyId) {
            queryBuilder.andWhere('activity.companyId = :companyId', { companyId: user.companyId });
        }

        return queryBuilder
            .orderBy('activity.activityDate', 'DESC')
            .addOrderBy('activity.createdAt', 'DESC')
            .getMany();
    }

    async findByType(type: ActivityType, user: User): Promise<Activity[]> {
        const queryBuilder = this.activityRepository.createQueryBuilder('activity')
            .where('activity.type = :type', { type });

        if (user.companyId) {
            queryBuilder.andWhere('activity.companyId = :companyId', { companyId: user.companyId });
        }

        return queryBuilder
            .orderBy('activity.activityDate', 'DESC')
            .addOrderBy('activity.createdAt', 'DESC')
            .getMany();
    }

    async update(id: number, updateActivityDto: UpdateActivityDto, user: User): Promise<Activity> {
        const activity = await this.findOne(id, user);
        Object.assign(activity, updateActivityDto);
        return this.activityRepository.save(activity);
    }

    async remove(id: number, user: User): Promise<void> {
        const activity = await this.findOne(id, user);
        await this.activityRepository.remove(activity);
    }

    async getUpcoming(user: User, limit: number = 10): Promise<Activity[]> {
        const queryBuilder = this.activityRepository.createQueryBuilder('activity')
            .where('activity.isCompleted = :isCompleted', { isCompleted: false })
            .andWhere('activity.activityDate >= :now', { now: new Date() });

        if (user.companyId) {
            queryBuilder.andWhere('activity.companyId = :companyId', { companyId: user.companyId });
        }

        return queryBuilder
            .orderBy('activity.activityDate', 'ASC')
            .limit(limit)
            .getMany();
    }
}
