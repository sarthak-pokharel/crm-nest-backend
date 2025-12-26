import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateUserDto } from './user.dto';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async saveUser(user: User): Promise<User> {
    try {
      return await this.save(user);
    } catch (error) {
      if (error.code === '23505') { // Postgres Unique Violation
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }
  async patch(id: number, data: UpdateUserDto): Promise<User> {
    try {
      const user = await this.preload({ id, ...data });

      if (!user) {
        throw new NotFoundException(`User #${id} not found`);
      }

      return await this.save(user);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }
  async getOrThrow(id: number): Promise<User> {
    try {
      return await this.findOneOrFail({ where: { id } });
    } catch (error) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}