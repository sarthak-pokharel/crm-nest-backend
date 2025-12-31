import { Module } from '@nestjs/common';
import { MessageListenerModule } from './message-listener/message-listener.module';
import { EmailHandlerModule } from './email-handler/email-handler.module';

@Module({
  imports: [MessageListenerModule, EmailHandlerModule],
  controllers: [],
  providers: [],
})
export class EmailServiceModule {}
