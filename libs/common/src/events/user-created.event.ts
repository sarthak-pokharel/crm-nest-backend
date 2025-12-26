import { User } from "apps/crm/src/auth/user";

export class UserCreatedEvent {
  constructor(
    public readonly user: User
  ) {}
}