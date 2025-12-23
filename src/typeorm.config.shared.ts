import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { DataSourceOptions } from "typeorm";

export function createTypeOrmConfig(configService?: ConfigService): DataSourceOptions {
  const get = (key: string) =>
    configService ? configService.get(key) : process.env[key];

  return {
    type: "postgres",
    host: get("DATABASE_HOST"),
    port: Number(get("DATABASE_PORT")),
    username: get("DATABASE_USERNAME"),
    password: get("DATABASE_PASSWORD"),
    database: get("DATABASE_NAME"),
    entities: [join(__dirname, "/**/*.entity{.ts,.js}")],
    migrations: [join(__dirname, "/migrations/*{.ts,.js}")],
    synchronize: false
  };
}