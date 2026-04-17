import { Injectable, UnauthorizedException } from "@nestjs/common";
import { CreateUserDto, User, UserService } from "./user";
import * as bcrypt from 'bcrypt';
import { JwtPayload, LoginResponse, RegisterResponse } from "@libs/common/types";
import { JwtService } from "@nestjs/jwt";
import { DataSource } from "typeorm";

@Injectable()
export class AuthService {

    private readonly SALT_ROUNDS = 10;

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly dataSource: DataSource,
    ) { }

    async register(data: CreateUserDto): Promise<RegisterResponse> {
        const hashedPassword = await this.hashPassword(data.password);

        const user = await this.userService.create({
            ...data,
            password: hashedPassword,
        });

        return {
            error: false,
            message: 'Registration successful',
            userId: user.id
        }
    }

    async login(email: string, password: string): Promise<LoginResponse> {
        const user = await this.userService.findByEmail(email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload: JwtPayload = { id: user.id, email: user.email };

        return {
            message: 'Login successful',
            userId: user.id,
            error: false,
            accessToken: this.jwtService.sign(payload)
        };

    }
    async validateUserByJwtPayload(payload: JwtPayload): Promise<User> {
        return await this.userService.findById(payload.id);
    }

    async me(user: User) {
        const { password, ...result } = user;

        // Fetch user's organizations and roles
        const userOrganizations = await this.dataSource.query(
            `SELECT DISTINCT 
                o.id, 
                o.name, 
                o.slug,
                o.logo,
                r.name as "roleName"
            FROM user_organization_roles uor
            JOIN organizations o ON uor."organizationId" = o.id
            JOIN roles r ON uor."roleId" = r.id
            WHERE uor."userId" = $1 AND o."isActive" = true
            ORDER BY o.name`,
            [user.id]
        );

        return {
            ...result,
            organizations: userOrganizations || [],
        };
    }

    async getPermissions(user: User, organizationId?: number) {
        // Fetch user's role-based permissions from database with scope
        // Include both global roles (user_roles) and organization-specific roles (user_organization_roles)
        const globalPermissions: { permission: string; scope: string }[] = await this.dataSource.query(
            `SELECT DISTINCT
                rp."permissionKey" as "permission",
                rp."scope" as "scope"
            FROM user_roles ur
            JOIN role_permissions rp ON ur."roleId" = rp."roleId"
            WHERE ur."userId" = $1`,
            [user.id]
        );

        const orgPermissions: { permission: string; scope: string }[] = organizationId
            ? await this.dataSource.query(
                `SELECT DISTINCT
                    rp."permissionKey" as "permission",
                    rp."scope" as "scope"
                FROM user_organization_roles uor
                JOIN role_permissions rp ON uor."roleId" = rp."roleId"
                WHERE uor."userId" = $1 AND uor."organizationId" = $2`,
                [user.id, organizationId]
            )
            : [];

        // Deduplicate permissions, keeping the broadest scope
        const scopeOrder = ['global', 'company', 'department', 'team', 'self', 'owner'];
        const permMap = new Map<string, string>();

        for (const p of [...globalPermissions, ...orgPermissions]) {
            const existing = permMap.get(p.permission);
            const scope = p.scope || 'global';
            if (!existing || scopeOrder.indexOf(scope) < scopeOrder.indexOf(existing)) {
                permMap.set(p.permission, scope);
            }
        }

        const permissions = Array.from(permMap.entries()).map(([permission, scope]) => ({
            permission,
            scope,
        }));

        return {
            userId: user.id,
            organizationId,
            permissions,
        };
    }

    async getAllUsers() {
        const users = await this.dataSource.query(
            `SELECT id, "firstName", "lastName", email, "isActive"
             FROM "user"
             WHERE "isActive" = true
             ORDER BY "firstName", "lastName"`
        );
        return users;
    }

    private async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }
}