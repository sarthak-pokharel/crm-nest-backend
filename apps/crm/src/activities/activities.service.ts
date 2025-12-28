import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity, ActivityType, ActivityRelationType } from './entities/activity.entity';
import { CreateActivityDto, UpdateActivityDto } from './dto';
import { User } from '../auth/user/user.entity';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';
import { TenantBaseService } from '../common/tenant-base.service';

@Injectable()
export class ActivitiesService extends TenantBaseService {
    constructor(
        @InjectRepository(Activity)
        private activityRepository: Repository<Activity>,
        @InjectRepository(UserOrganizationRole)
        protected userOrganizationRoleRepository: Repository<UserOrganizationRole>,
    ) {
        super(userOrganizationRoleRepository);
    }

    async create(createActivityDto: CreateActivityDto, user: User, contextOrgId?: number): Promise<Activity> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        const activity = this.activityRepository.create({
            ...createActivityDto,
            createdById: user.id,
            organizationId,
            userId: user.id,
        });
        return this.activityRepository.save(activity);
    }

    async findAll(user: User, contextOrgId?: number): Promise<Activity[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        return this.activityRepository.createQueryBuilder('activity')
            .where('activity.organizationId = :organizationId', { organizationId })
            .orderBy('activity.activityDate', 'DESC')
            .addOrderBy('activity.createdAt', 'DESC')
            .getMany();
    }

    async findOne(id: number, user: User, contextOrgId?: number): Promise<Activity> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        const activity = await this.activityRepository.findOne({ 
            where: { id, organizationId },
        });
        
        if (!activity) {
            throw new NotFoundException(`Activity with ID ${id} not found`);
        }

        return activity;
    }

    async findByRelation(relationType: ActivityRelationType, relationId: number, user: User, contextOrgId?: number): Promise<Activity[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        return this.activityRepository.createQueryBuilder('activity')
            .where('activity.relationType = :relationType', { relationType })
            .andWhere('activity.relationId = :relationId', { relationId })
            .andWhere('activity.organizationId = :organizationId', { organizationId })
            .orderBy('activity.activityDate', 'DESC')
            .addOrderBy('activity.createdAt', 'DESC')
            .getMany();
    }

    async findByType(type: ActivityType, user: User, contextOrgId?: number): Promise<Activity[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        return this.activityRepository.createQueryBuilder('activity')
            .where('activity.type = :type', { type })
            .andWhere('activity.organizationId = :organizationId', { organizationId })
            .orderBy('activity.activityDate', 'DESC')
            .addOrderBy('activity.createdAt', 'DESC')
            .getMany();
    }

    async update(id: number, updateActivityDto: UpdateActivityDto, user: User, contextOrgId?: number): Promise<Activity> {
        const activity = await this.findOne(id, user, contextOrgId);
        Object.assign(activity, updateActivityDto);
        return this.activityRepository.save(activity);
    }

    async remove(id: number, user: User, contextOrgId?: number): Promise<void> {
        const activity = await this.findOne(id, user, contextOrgId);
        await this.activityRepository.remove(activity);
    }

    async getUpcoming(user: User, limit: number = 10, contextOrgId?: number): Promise<Activity[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        return this.activityRepository.createQueryBuilder('activity')
            .where('activity.isCompleted = :isCompleted', { isCompleted: false })
            .andWhere('activity.activityDate >= :now', { now: new Date() })
            .andWhere('activity.organizationId = :organizationId', { organizationId })
            .orderBy('activity.activityDate', 'ASC')
            .limit(limit)
            .getMany();
    }
}
