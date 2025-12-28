import { DataSource } from "typeorm";
import "dotenv/config";
import { createTypeOrmConfig } from "../apps/crm/src/typeorm.config.shared";

export const AppDataSource = new DataSource(createTypeOrmConfig());