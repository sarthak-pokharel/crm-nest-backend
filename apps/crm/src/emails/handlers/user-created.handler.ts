import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { UserCreatedEvent } from '@libs/common/events/user-created.event';
import { SendEmailCommand } from '@libs/common/events/send-email.command';
import { ACTIONS, EMAIL_TEMPLATES } from '@libs/common/constants';
import { Logger } from '@nestjs/common';

@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
    private readonly logger = new Logger(UserCreatedHandler.name);

    constructor(private readonly commandBus: CommandBus) { }

    async handle(event: UserCreatedEvent) {
        this.logger.log(`Handling UserCreatedEvent for: ${event.user.email}`);

        // This dispatch will be intercepted by the Main Service Saga
        await this.commandBus.execute(
            new SendEmailCommand(
                ACTIONS.SEND_EMAIL,
                event.user.email,
                {

                    template: EMAIL_TEMPLATES.WELCOME_EMAIL,
                    subject: 'Welcome to Our CRM Platform',
                    context: {
                        name: event.user.firstName
                    }
                }
            )
        );
    }
}