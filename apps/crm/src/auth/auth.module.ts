import { Module } from '@nestjs/common';
import { UserModule, UserService } from './user';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { OrganizationModule } from './organization';

@Module({
  imports: [
    UserModule,
    OrganizationModule,
    PassportModule, 
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'fallbackSecret'),
        signOptions: {
          expiresIn: Number(configService.get<string>('JWT_EXPIRES_IN', '3600')),
        },
      }),
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
