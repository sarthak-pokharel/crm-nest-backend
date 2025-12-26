import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { UserCreatedEvent } from './events/user-created.event';

@Module({
  providers: [CommonService],
  exports: [CommonService, UserCreatedEvent],
})
export class CommonModule {}
