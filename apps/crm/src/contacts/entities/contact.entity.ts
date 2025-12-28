import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../company/entities/company.entity';

@Entity('contacts')
export class Contact {
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
    mobile: string;

    @Column({ nullable: true })
    jobTitle: string;

    @Column({ nullable: true })
    department: string;

    @Column({ nullable: true })
    companyId: number;

    @ManyToOne(() => Company, { nullable: true })
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column({ nullable: true })
    linkedInUrl: string;

    @Column({ nullable: true })
    twitterHandle: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

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

    @Column({ type: 'date', nullable: true })
    birthday: Date;

    @Column({ default: true })
    isPrimary: boolean;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    ownerId: number;

    @Column({ type: 'timestamp', nullable: true })
    lastContactedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
