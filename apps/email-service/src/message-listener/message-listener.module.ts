import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EmailHandler } from './email.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        CqrsModule,
        ConfigModule.forRoot({ isGlobal: true }), // Loads .env
    ],
    controllers: [EmailHandler],
    providers: [],
})
export class MessageListenerModule { }
