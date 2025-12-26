import { CommonModule } from '@libs/common';
import { UserCreatedEvent } from '@libs/common/events/user-created.event';
import { Module } from '@nestjs/common';

import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserCreatedHandler } from './handlers/user-created.handler';
import { CqrsModule } from '@nestjs/cqrs';
import { SendEmailHandler } from './core/send-email.emit';

@Module({
    imports: [

      CqrsModule, 
        ClientsModule.register([
      {
        name: 'EMAIL_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '0.0.0.0',
          port: 7771,
        },
      },
    ]),
    
    ],
    
    providers: [SendEmailHandler, UserCreatedHandler]
})
export class EmailsModule {}
