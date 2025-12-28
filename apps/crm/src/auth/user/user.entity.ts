
import { UserCreatedEvent } from '../../../../../libs/common/src/events/user-created.event';
import { AggregateRoot } from '@nestjs/cqrs';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../organization/organization.entity';
import { UserOrganizationRole } from '../organization/user-organization-role.entity';

@Entity()
export class User extends AggregateRoot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  // Organization (multi-tenant)
  @Column({ nullable: true })
  organizationId: number;

  @ManyToOne(() => Organization, (org) => org.users)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // Scope fields within organization
  @Column({ nullable: true })
  companyId: number;

  @Column({ nullable: true })
  departmentId: number;

  @Column({ nullable: true })
  teamId: number;

  @OneToMany('UserRole', 'user')
  userRoles: any[];

  @OneToMany(() => UserOrganizationRole, userOrgRole => userOrgRole.user)
  userOrganizationRoles: UserOrganizationRole[];

  register() {
    this.apply(new UserCreatedEvent(this));
  }
}
