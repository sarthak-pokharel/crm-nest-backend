import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { createTypeOrmConfig } from "./typeorm.config.shared";


export const typeOrmConfig = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => createTypeOrmConfig(configService),
});


@Module({
  imports: [

    // Env vars thingy
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),

    // Type orm init
    typeOrmConfig,

    //Other stuffs
    // hehe

  ]
})
export class AppModule {}