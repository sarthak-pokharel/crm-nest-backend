
import { UserCreatedEvent } from '@libs/common/events/user-created.event';
import { AggregateRoot } from '@nestjs/cqrs';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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

  register() {
    this.apply(new UserCreatedEvent(this.id, this.email));
  }
}
