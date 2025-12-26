import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { createTypeOrmConfig } from "./typeorm.config.shared";
// import { UserModule } from './user/user.module';
// import { PostModule } from './post/post.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from "@nestjs/jwt";
import { EmailsModule } from './emails/emails.module';


export const typeOrmConfig = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    ...createTypeOrmConfig(configService),
    autoLoadEntities: true
  }),
});


@Module({
  imports: [

    // Env vars thingy
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    typeOrmConfig,

    AuthModule

  ]
})
export class AppModule {}