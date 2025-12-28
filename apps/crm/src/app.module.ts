import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { createTypeOrmConfig } from "./typeorm.config.shared";
import { AuthModule } from './auth/auth.module';
import { JwtModule } from "@nestjs/jwt";
import { EmailsModule } from './emails/emails.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CompanyModule } from './company/company.module';
import { LeadsModule } from './leads/leads.module';
import { ContactsModule } from './contacts/contacts.module';
import { DealsModule } from './deals/deals.module';
import { ActivitiesModule } from './activities/activities.module';
import { TasksModule } from './tasks/tasks.module';


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

    AuthModule,
    EmailsModule,
    PermissionsModule,
    CompanyModule,
    LeadsModule,
    ContactsModule,
    DealsModule,
    ActivitiesModule,
    TasksModule,

  ]
})
export class AppModule { }