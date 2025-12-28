import { PureAbility, AbilityBuilder, AbilityClass } from '@casl/ability';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'manage' | 'assign' | 'approve' | 'close' | 'publish';

export type Subject =
    | 'Lead'
    | 'Deal'
    | 'User'
    | 'Role'
    | 'Permission'
    | 'Content'
    | 'Account'
    | 'all';

export type AppAbility = PureAbility<[Action, Subject]>;

export const AppAbility = PureAbility as AbilityClass<AppAbility>;

export function createAbilityBuilder() {
    return new AbilityBuilder<AppAbility>(AppAbility);
}
