import { Injectable, Req } from "@nestjs/common";
import { CreateUserDto, User, UserService } from "./user";
import * as bcrypt from 'bcrypt';
import { JwtPayload, LoginResponse, RegisterResponse } from "@libs/common/types";
import { JwtService } from "@nestjs/jwt";
import { last } from "rxjs";

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) { }
    getStatus() {
        return { status: 'Auth service is running' };
    }
    private async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    }

    async register(data: CreateUserDto): Promise<RegisterResponse> {
        const userExists = await this.userService.userWithEmailExists(data.email);
        if (userExists) {
            return { error: true, message: 'User with this email already exists' };
        }

        const hashedPassword = await this.hashPassword(data.password);
        const user = await this.userService.create({
            ...data,
            password: hashedPassword,
        });
        return { error: false, message: 'Registration successful', userId: user.id };
    }

    async login(email: string, password: string): Promise<LoginResponse> {
        const user = await this.userService.findByEmail(email);

        if (!user) {
            return { error: true, message: 'User not found' };
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return { error: true, message: 'Invalid password' };
        }

        const payload: JwtPayload = { id: user.id, email: user.email };
        return { message: 'Login successful', userId: user.id, error: false, accessToken: this.jwtService.sign(payload) };
    }
    async validateUserByJwtPayload(payload: JwtPayload): Promise<User | null> {
        const checkUser = await this.userService.findById(payload.id);
        if (checkUser) {
            return checkUser;
        }
        return null;
    }
    me(user: User) {
        // Placeholder implementation
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive
        };
    }
}