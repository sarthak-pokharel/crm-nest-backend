import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EmailCommandHandler } from '../email-handler/email.handler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from '../email-handler/email.processor';
import { TemplateService } from '../email-handler/template.service';
import { MailerService } from '../email-handler/mailer.service';

@Module({
    imports: [
        CqrsModule,
        ConfigModule.forRoot({ isGlobal: true }), // Loads .env

        // 1. Configure Redis Connection Globally
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                connection: {
                    host: config.get<string>('REDIS_HOST', 'localhost'),
                    port: config.get<number>('REDIS_PORT', 6379),
                },
            }),
        }),

        // 2. Register Email Queue with Default Options
        BullModule.registerQueueAsync({
            name: 'email',
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                defaultJobOptions: {
                    removeOnComplete: true,
                    removeOnFail: false,
                    attempts: config.get<number>('EMAIL_RETRY_ATTEMPTS', 3),
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                },
            }),
        }),
    ],
    controllers: [],
    providers: [EmailCommandHandler, EmailProcessor, TemplateService, MailerService],
})
export class EmailHandlerModule { }
