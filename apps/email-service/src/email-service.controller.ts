import { Controller, Get } from '@nestjs/common';
import { EmailServiceService } from './email-service.service';

@Controller()
export class EmailServiceController {
  constructor(private readonly emailServiceService: EmailServiceService) {}

  @Get()
  getHello(): string {
    return this.emailServiceService.getHello();
  }
}
