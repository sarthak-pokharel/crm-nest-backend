import { CommonModule } from '@libs/common';
import { UserCreatedEvent } from '@libs/common/events/user-created.event';
import { Module } from '@nestjs/common';
import { UserCreatedHandler } from './user-created.handler';

@Module({
    providers: [UserCreatedHandler],
    imports: []
})
export class EmailsModule {}
