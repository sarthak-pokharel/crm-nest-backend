import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ActivityType {
    CALL = 'call',
    EMAIL = 'email',
    MEETING = 'meeting',
    NOTE = 'note',
    TASK = 'task',
    DEAL = 'deal',
    OTHER = 'other',
}

export enum ActivityRelationType {
    LEAD = 'lead',
    CONTACT = 'contact',
    COMPANY = 'company',
    DEAL = 'deal',
}

@Entity('activities')
export class Activity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: ActivityType })
    type: ActivityType;

    @Column()
    subject: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'enum', enum: ActivityRelationType })
    relationType: ActivityRelationType;

    @Column()
    relationId: number;

    @Column({ type: 'int', nullable: true })
    duration: number; // in minutes

    @Column({ type: 'timestamp', nullable: true })
    activityDate: Date;

    @Column({ default: false })
    isCompleted: boolean;

    @Column({ nullable: true })
    outcome: string;

    @Column({ nullable: true })
    userId: number;

    @Column({ nullable: true })
    companyId: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
