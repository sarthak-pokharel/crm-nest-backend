import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";


@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('status')
    getStatus() {
        return this.authService.getStatus();
    }

    @Post("/login")
    login(@Body() body: { username: string; password: string }) {
        // Implement login logic here
        return { message: `User ${body.username} logged in successfully` };
    }
    
}