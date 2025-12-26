import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './user.dto';
import { EventBus, EventPublisher } from '@nestjs/cqrs';
import { UserCreatedEvent } from '@libs/common/events/user-created.event';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly publisher: EventPublisher,
    ) { }

    async create(data: CreateUserDto): Promise<User> {
        const user = this.userRepository.create(data);
        const savedUser = await this.userRepository.saveUser(user);
        const userModel = this.publisher.mergeObjectContext(savedUser);
        userModel.register();
        userModel.commit();

        return savedUser;
    }
    async update(id: number, data: UpdateUserDto): Promise<User> {
        return this.userRepository.patch(id, data);
    }

    async remove(id: number): Promise<void> {
        const user = await this.userRepository.getOrThrow(id);
        await this.userRepository.remove(user);
    }


    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findByEmail(email);
    }
    async findById(id: number): Promise<User> {
        return this.userRepository.getOrThrow(id);
    }

}