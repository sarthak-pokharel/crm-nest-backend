import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';

@Module({
    controllers: [],
    providers: [UserService],
    imports: [TypeOrmModule.forFeature([User])],
    exports: [],
})
export class UserModule {}
