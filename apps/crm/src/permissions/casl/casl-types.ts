import { PureAbility, AbilityBuilder, AbilityClass } from '@casl/ability';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'manage' | 'assign' | 'approve' | 'close' | 'publish';

export type Subject =
    | 'lead'
    | 'deal'
    | 'user'
    | 'role'
    | 'permission'
    | 'organization'
    | 'company'
    | 'contact'
    | 'task'
    | 'activity'
    | 'email'
    | 'content'
    | 'account'
    | 'all';

export type AppAbility = PureAbility<[Action, Subject]>;

export const AppAbility = PureAbility as AbilityClass<AppAbility>;

export function createAbilityBuilder() {
    return new AbilityBuilder<AppAbility>(AppAbility);
}
