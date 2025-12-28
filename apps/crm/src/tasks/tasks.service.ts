import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { User } from '../auth/user/user.entity';
import { UserOrganizationRole } from '../auth/organization/user-organization-role.entity';
import { TenantBaseService } from '../common/tenant-base.service';

@Injectable()
export class TasksService extends TenantBaseService {
    constructor(
        @InjectRepository(Task)
        private taskRepository: Repository<Task>,
        @InjectRepository(UserOrganizationRole)
        protected userOrganizationRoleRepository: Repository<UserOrganizationRole>,
    ) {
        super(userOrganizationRoleRepository);
    }

    async create(createTaskDto: CreateTaskDto, user: User, contextOrgId?: number): Promise<Task> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        const task = this.taskRepository.create({
            ...createTaskDto,
            createdById: user.id,
            organizationId,
            assignedToId: createTaskDto.assignedToId || user.id,
        });
        return this.taskRepository.save(task);
    }

    async findAll(user: User, contextOrgId?: number): Promise<Task[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        return this.taskRepository.createQueryBuilder('task')
            .where('task.organizationId = :organizationId', { organizationId })
            .orderBy('task.dueDate', 'ASC')
            .addOrderBy('task.priority', 'DESC')
            .getMany();
    }

    async findOne(id: number, user: User, contextOrgId?: number): Promise<Task> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        const task = await this.taskRepository.findOne({ 
            where: { id, organizationId },
        });
        
        if (!task) {
            throw new NotFoundException(`Task with ID ${id} not found`);
        }

        return task;
    }

    async findMyTasks(user: User, contextOrgId?: number): Promise<Task[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        return this.taskRepository.createQueryBuilder('task')
            .where('task.assignedToId = :userId', { userId: user.id })
            .andWhere('task.organizationId = :organizationId', { organizationId })
            .andWhere('task.status != :status', { status: TaskStatus.COMPLETED })
            .orderBy('task.dueDate', 'ASC')
            .addOrderBy('task.priority', 'DESC')
            .getMany();
    }

    async findOverdue(user: User, contextOrgId?: number): Promise<Task[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        const now = new Date();
        
        return this.taskRepository.createQueryBuilder('task')
            .where('task.dueDate < :now', { now })
            .andWhere('task.organizationId = :organizationId', { organizationId })
            .andWhere('task.status != :status', { status: TaskStatus.COMPLETED })
            .orderBy('task.dueDate', 'ASC')
            .getMany();
    }

    async findByStatus(status: TaskStatus, user: User, contextOrgId?: number): Promise<Task[]> {
        const organizationId = await this.validateOrganizationAccess(user, contextOrgId);
        
        return this.taskRepository.createQueryBuilder('task')
            .where('task.status = :status', { status })
            .andWhere('task.organizationId = :organizationId', { organizationId })
            .orderBy('task.dueDate', 'ASC')
            .getMany();
    }

    async update(id: number, updateTaskDto: UpdateTaskDto, user: User, contextOrgId?: number): Promise<Task> {
        const task = await this.findOne(id, user, contextOrgId);

        // Set completedAt when status changes to completed
        if (updateTaskDto.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
            task.completedAt = new Date();
        }

        Object.assign(task, updateTaskDto);
        return this.taskRepository.save(task);
    }

    async remove(id: number, user: User, contextOrgId?: number): Promise<void> {
        const task = await this.findOne(id, user, contextOrgId);
        await this.taskRepository.remove(task);
    }

    async completeTask(id: number, user: User, contextOrgId?: number): Promise<Task> {
        const task = await this.findOne(id, user, contextOrgId);
        task.status = TaskStatus.COMPLETED;
        task.completedAt = new Date();
        return this.taskRepository.save(task);
    }
}
