import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    create(@Body() data: CreateUserDto) {
        return this.userService.create(data);
    }

    @Get()
    findAll() {
        return this.userService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.userService.findById(id);
    }

    @Put(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() data: UpdateUserDto,
    ) {
        return this.userService.update(id, data);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.userService.remove(id);
    }
}
