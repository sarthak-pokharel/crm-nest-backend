import { Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../auth/organization/organization.entity';
import { User } from '../auth/user/user.entity';

/**
 * Base entity for all multi-tenant CRM entities
 * Provides common fields for organization context, ownership, and auditing
 */
export abstract class TenantBaseEntity {
  @Column()
  organizationId: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  updatedById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
