import { Body, Controller, Get, Post, Req, UseGuards, Query } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CreateUserDto, LoginUserDto } from "./user/user.dto";
import { JwtStrategy } from "./jwt/jwt.strategy";
import { JwtAuthGuard } from "./jwt/jwt.guard";
import { PermissionGuard } from "../permissions/guards/permission.guard";
import { Permission } from "../permissions/decorators/permission.decorator";
import { Permissions } from "@libs/common";
import { GetUser } from "./user/user.decorator";


@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    
    @Post("/login")
    login(@Body() body: LoginUserDto) {
        return this.authService.login(body.email, body.password);
    }
    
    @Post("/register")
    register(@Body() body: CreateUserDto) {
        return this.authService.register(body);
    }

    @UseGuards(JwtAuthGuard)
    @Get("/me")
    me(@GetUser() user) {
        return this.authService.me(user);
    }

    @UseGuards(JwtAuthGuard)
    @Get("/permissions")
    permissions(@GetUser() user, @Query('organizationId') organizationId?: string) {
        return this.authService.getPermissions(
            user, 
            organizationId ? parseInt(organizationId) : undefined
        );
    }

    @UseGuards(JwtAuthGuard, PermissionGuard)
    @Permission(Permissions.User.READ)
    @Get("/users")
    async getAllUsers() {
        return this.authService.getAllUsers();
    }
}