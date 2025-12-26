import { ACTIONS } from "@libs/common/constants";
import { Controller, Logger } from "@nestjs/common";
import { CommandBus, EventBus } from "@nestjs/cqrs";
import { EventPattern, Payload } from "@nestjs/microservices";
import { SendEmailCommand } from "@libs/common/events/send-email.command";

@Controller()
export class EmailHandler {
  constructor(private readonly commandBus: CommandBus) {}

  @EventPattern(ACTIONS.SEND_EMAIL)
  async handleSendEmail(@Payload() data: any) {
    return this.commandBus.execute(
      new SendEmailCommand(
        ACTIONS.SEND_EMAIL,
        data.recipient,
        data 
      )
    );
  }
}