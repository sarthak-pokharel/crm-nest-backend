import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { Contact } from '../../contacts/entities/contact.entity';
import { TenantBaseEntity } from '../../common/base.entity';

export enum DealStage {
    PROSPECTING = 'prospecting',
    QUALIFICATION = 'qualification',
    PROPOSAL = 'proposal',
    NEGOTIATION = 'negotiation',
    CLOSED_WON = 'closed_won',
    CLOSED_LOST = 'closed_lost',
}

export enum DealPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

@Entity('deals')
export class Deal extends TenantBaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    value: number;

    @Column({ type: 'enum', enum: DealStage, default: DealStage.PROSPECTING })
    stage: DealStage;

    @Column({ type: 'enum', enum: DealPriority, default: DealPriority.MEDIUM })
    priority: DealPriority;

    @Column({ type: 'int', default: 0 })
    probability: number; // 0-100

    @Column({ nullable: true })
    companyId: number;

    @ManyToOne(() => Company, { nullable: true })
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column({ nullable: true })
    contactId: number;

    @ManyToOne(() => Contact, { nullable: true })
    @JoinColumn({ name: 'contactId' })
    contact: Contact;

    @Column({ type: 'date', nullable: true })
    expectedCloseDate: Date;

    @Column({ type: 'date', nullable: true })
    actualCloseDate: Date;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ nullable: true })
    assignedToId: number;

    @Column({ nullable: true })
    ownerId: number;

    @Column({ nullable: true })
    lostReason: string;

    @Column({ default: true })
    isActive: boolean;
}
