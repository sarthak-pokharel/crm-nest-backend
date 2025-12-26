import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
