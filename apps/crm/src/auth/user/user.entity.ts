
import { UserCreatedEvent } from '../../../../../libs/common/src/events/user-created.event';
import { AggregateRoot } from '@nestjs/cqrs';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

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

  // Multi-tenant and scope fields
  @Column({ nullable: true })
  companyId: number;

  @Column({ nullable: true })
  departmentId: number;

  @Column({ nullable: true })
  teamId: number;

  @OneToMany('UserRole', 'user')
  userRoles: any[];

  register() {
    this.apply(new UserCreatedEvent(this));
  }
}
