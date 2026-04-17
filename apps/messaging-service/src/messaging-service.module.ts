import { Module } from '@nestjs/common';
import { MessagingServiceController } from './messaging-service.controller';
import { MessagingServiceService } from './messaging-service.service';

@Module({
  imports: [],
  controllers: [MessagingServiceController],
  providers: [MessagingServiceService],
})
export class MessagingServiceModule {}
