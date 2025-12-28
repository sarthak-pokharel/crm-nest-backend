import { ACTIONS } from '../constants';
import { EmailData } from '../types/email.types';

export class SendEmailCommand {
  // We explicitly type the action to the constant value
  public readonly action: typeof ACTIONS.SEND_EMAIL = ACTIONS.SEND_EMAIL;

  constructor(
    public readonly eventType: string, 
    public readonly recipient: string, 
    public readonly data: EmailData,
  ) {}
}