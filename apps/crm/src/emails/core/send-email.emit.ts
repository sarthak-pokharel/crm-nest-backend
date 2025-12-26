import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SendEmailCommand } from '@libs/common/events/send-email.command';

@CommandHandler(SendEmailCommand)
export class SendEmailHandler implements ICommandHandler<SendEmailCommand> {
  constructor(
    @Inject('EMAIL_SERVICE') private readonly client: ClientProxy,
  ) {}

  async execute(command: SendEmailCommand) {
    const { action, recipient, data } = command;
    console.log(command)
    return this.client.emit(action, {
      recipient,
      ...data,
    });
  }
}