import { User } from '../../auth/user/user.entity';
import { AppAbility } from '../casl/casl-types';

// Injection token
export const IAbilityFactory = Symbol('IAbilityFactory');

export interface IAbilityFactory {
    createForUser(user: User): Promise<AppAbility>;
}
