import { Module } from '@nestjs/common';
import { MessageListenerModule } from './message-listener/message-listener.module';

@Module({
  imports: [MessageListenerModule],
  controllers: [],
  providers: [],
})
export class EmailServiceModule {}
