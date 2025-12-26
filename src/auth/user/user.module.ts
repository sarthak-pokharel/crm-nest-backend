import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
    controllers: [],
    providers: [UserService, UserRepository],
    imports: [
        TypeOrmModule.forFeature([User]),
        CqrsModule
    ],
    exports: [UserService],
})
export class UserModule {}
