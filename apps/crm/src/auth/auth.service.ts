import { Injectable, Req, UnauthorizedException } from "@nestjs/common";
import { CreateUserDto, User, UserService } from "./user";
import * as bcrypt from 'bcrypt';
import { JwtPayload, LoginResponse, RegisterResponse } from "@libs/common/types";
import { JwtService } from "@nestjs/jwt";
import { last } from "rxjs";

@Injectable()
export class AuthService {

    private readonly SALT_ROUNDS = 10;

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
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
    me(user: User): Partial<User> {
        const { password, ...result } = user;
        return result;
    }
    private async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }
}