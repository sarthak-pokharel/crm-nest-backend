import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TaskPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

export enum TaskStatus {
    TODO = 'todo',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
    status: TaskStatus;

    @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
    priority: TaskPriority;

    @Column({ type: 'timestamp', nullable: true })
    dueDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date;

    @Column({ nullable: true })
    assignedToId: number;

    @Column({ nullable: true })
    ownerId: number;

    @Column({ nullable: true })
    relatedToType: string; // lead, contact, company, deal

    @Column({ nullable: true })
    relatedToId: number;

    @Column({ nullable: true })
    companyId: number;

    @Column({ default: false })
    isReminder: boolean;

    @Column({ type: 'timestamp', nullable: true })
    reminderDate: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
