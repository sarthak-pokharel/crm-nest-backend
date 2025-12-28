
export interface JwtPayload {
    id: number;
    email: string;
    organizationId?: number;
    iat?: number;
    exp?: number;
}