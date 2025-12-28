import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { User } from '../auth/user/user.entity';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task)
        private taskRepository: Repository<Task>,
    ) {}

    async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
        const task = this.taskRepository.create({
            ...createTaskDto,
            ownerId: user.id,
            assignedToId: createTaskDto.assignedToId || user.id,
            companyId: user.companyId,
        });
        return this.taskRepository.save(task);
    }

    async findAll(user: User): Promise<Task[]> {
        const queryBuilder = this.taskRepository.createQueryBuilder('task');

        // Apply scope filtering
        if (user.companyId) {
            queryBuilder.andWhere('task.companyId = :companyId', { companyId: user.companyId });
        }

        return queryBuilder
            .orderBy('task.dueDate', 'ASC')
            .addOrderBy('task.priority', 'DESC')
            .getMany();
    }

    async findOne(id: number, user: User): Promise<Task> {
        const task = await this.taskRepository.findOne({ where: { id } });
        
        if (!task) {
            throw new NotFoundException(`Task with ID ${id} not found`);
        }

        // Check scope access
        if (user.companyId && task.companyId !== user.companyId) {
            throw new ForbiddenException('You do not have access to this task');
        }

        return task;
    }

    async findMyTasks(user: User): Promise<Task[]> {
        const queryBuilder = this.taskRepository.createQueryBuilder('task')
            .where('task.assignedToId = :userId', { userId: user.id })
            .andWhere('task.status != :status', { status: TaskStatus.COMPLETED });

        return queryBuilder
            .orderBy('task.dueDate', 'ASC')
            .addOrderBy('task.priority', 'DESC')
            .getMany();
    }

    async findOverdue(user: User): Promise<Task[]> {
        const now = new Date();
        const queryBuilder = this.taskRepository.createQueryBuilder('task')
            .where('task.dueDate < :now', { now })
            .andWhere('task.status != :status', { status: TaskStatus.COMPLETED });

        if (user.companyId) {
            queryBuilder.andWhere('task.companyId = :companyId', { companyId: user.companyId });
        }

        return queryBuilder
            .orderBy('task.dueDate', 'ASC')
            .getMany();
    }

    async findByStatus(status: TaskStatus, user: User): Promise<Task[]> {
        const queryBuilder = this.taskRepository.createQueryBuilder('task')
            .where('task.status = :status', { status });

        if (user.companyId) {
            queryBuilder.andWhere('task.companyId = :companyId', { companyId: user.companyId });
        }

        return queryBuilder
            .orderBy('task.dueDate', 'ASC')
            .getMany();
    }

    async update(id: number, updateTaskDto: UpdateTaskDto, user: User): Promise<Task> {
        const task = await this.findOne(id, user);

        // Set completedAt when status changes to completed
        if (updateTaskDto.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
            task.completedAt = new Date();
        }

        Object.assign(task, updateTaskDto);
        return this.taskRepository.save(task);
    }

    async remove(id: number, user: User): Promise<void> {
        const task = await this.findOne(id, user);
        await this.taskRepository.remove(task);
    }

    async completeTask(id: number, user: User): Promise<Task> {
        const task = await this.findOne(id, user);
        task.status = TaskStatus.COMPLETED;
        task.completedAt = new Date();
        return this.taskRepository.save(task);
    }
}
