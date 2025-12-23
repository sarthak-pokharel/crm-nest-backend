import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CreateUserDto, LoginUserDto } from "./user/user.dto";


@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('status')
    getStatus() {
        return this.authService.getStatus();
    }

    @Post("/login")
    login(@Body() body: LoginUserDto) {
        return this.authService.login(body.email, body.password);
    }
    
    @Post("/register")
    register(@Body() body: CreateUserDto) {
        return this.authService.register(body);
    }
}