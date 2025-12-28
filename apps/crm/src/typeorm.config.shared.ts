import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { DataSourceOptions } from "typeorm";

export function createTypeOrmConfig(configService?: ConfigService): DataSourceOptions {
  const get = (key: string) =>
    configService ? configService.get(key) : process.env[key];
  
  // Check if we're running from source or compiled
  const isDevelopment = __dirname.includes('src');
  
  const entitiesPath = isDevelopment 
    ? join(__dirname, "/**/*.entity{.ts,.js}")
    : join(__dirname, "/**/*.entity.js");
    
  const migrationsPath = isDevelopment
    ? join(__dirname, "/migrations/*{.ts,.js}")
    : join(__dirname, "/migrations/*.js");
  
  console.log("Entities path:", entitiesPath);
  console.log("Migrations path:", migrationsPath);
  
  return {
    type: "postgres",
    host: get("DATABASE_HOST"),
    port: Number(get("DATABASE_PORT")),
    username: get("DATABASE_USERNAME"),
    password: get("DATABASE_PASSWORD"),
    database: get("DATABASE_NAME"),
    entities: [entitiesPath],
    migrations: [migrationsPath],
    synchronize: false
  };
}