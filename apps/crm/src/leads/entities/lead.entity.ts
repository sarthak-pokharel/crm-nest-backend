import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../company/entities/company.entity';

export enum LeadStatus {
    NEW = 'new',
    CONTACTED = 'contacted',
    QUALIFIED = 'qualified',
    UNQUALIFIED = 'unqualified',
    CONVERTED = 'converted',
    LOST = 'lost',
}

export enum LeadSource {
    WEBSITE = 'website',
    REFERRAL = 'referral',
    SOCIAL_MEDIA = 'social_media',
    EMAIL_CAMPAIGN = 'email_campaign',
    COLD_CALL = 'cold_call',
    EVENT = 'event',
    OTHER = 'other',
}

@Entity('leads')
export class Lead {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    jobTitle: string;

    @Column({ nullable: true })
    companyName: string;

    @Column({ nullable: true })
    companyId: number;

    @ManyToOne(() => Company, { nullable: true })
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
    status: LeadStatus;

    @Column({ type: 'enum', enum: LeadSource, default: LeadSource.OTHER })
    source: LeadSource;

    @Column({ type: 'int', nullable: true, default: 0 })
    score: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    estimatedValue: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ nullable: true })
    website: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    zipCode: string;

    @Column({ nullable: true })
    assignedToId: number;

    @Column({ nullable: true })
    ownerId: number;

    @Column({ type: 'timestamp', nullable: true })
    lastContactedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
