import { SendEmailCommand } from "@libs/common/events/send-email.command";
import { InjectQueue } from "@nestjs/bullmq";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Queue } from "bullmq";


@CommandHandler(SendEmailCommand)
export class EmailCommandHandler implements ICommandHandler<SendEmailCommand> {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async execute(command: SendEmailCommand) {
    const { recipient, data } = command;

    await this.emailQueue.add('send-email', {
      to: recipient,
      subject: data.subject,
      templateName: data.template, // The folder name in /static/email-templates
      templateData: data.context,
    });

    return { status: 'queued', recipient };
  }
}