#!/usr/bin/env ts-node

import { NestFactory } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { join } from "path";
import { spawnSync } from "child_process";
import { Module } from "@nestjs/common";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
class AppConfigModule {}

async function createDataSource() {
  const app = await NestFactory.createApplicationContext(AppConfigModule, { logger: false });
  const config = app.get(ConfigService);

  const ds = new DataSource({
    type: "postgres",
    host: config.get("DATABASE_HOST"),
    port: Number(config.get("DATABASE_PORT")),
    username: config.get("DATABASE_USERNAME"),
    password: config.get("DATABASE_PASSWORD"),
    database: config.get("DATABASE_NAME"),
    entities: [__dirname + "/**/*.entity{.ts,.js}"],
    synchronize: false,
  });

  await app.close();
  return ds;
}

async function runMigrations() {
  const ds = await createDataSource();
  await ds.initialize();
  console.log("🚀 Running migrations...");
  await ds.runMigrations();
  console.log("✅ Done");
  await ds.destroy();
}

async function revertLastMigration() {
  const ds = await createDataSource();
  await ds.initialize();
  console.log("⏪ Reverting last migration...");
  await ds.undoLastMigration();
  await ds.destroy();
}
function generateMigration(name: string) {
  if (!name) {
    console.error("🔥 Missing migration name");
    process.exit(1);
  }
  console.log(`🛠 Generating migration: ${name}`);

  // Point to static DataSource
  spawnSync(
    "pnpm",
    [
      "exec",
      "typeorm-ts-node-commonjs",
      "migration:generate",
      join("src/migrations", name),
      "-d",
      "scripts/data-source.ts" // <-- use static DataSource
    ],
    { stdio: "inherit", shell: true }
  );
}
(async () => {
  const [, , cmd, arg] = process.argv;

  switch (cmd) {
    case "run":
      await runMigrations();
      break;
    case "revert":
      await revertLastMigration();
      break;
    case "generate":
      generateMigration(arg);
      break;
    default:
      console.log(`
Usage:
  ts-node migration.ts generate <Name>
  ts-node migration.ts run
  ts-node migration.ts revert
`);
  }
})();
