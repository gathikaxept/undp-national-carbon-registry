/**
 * Standalone TypeORM DataSource for the CLI (migration:generate / migration:run).
 *
 * This file is NOT used by the running NestJS application — the app builds its
 * DataSource via `TypeOrmConfigService` (libs/core/src/app-config/typeorm.config.service.ts)
 * from the same `database` config. We re-import that same config object here so
 * the two stay in lock-step (host/port/user/password/db name).
 *
 * Usage:
 *   yarn typeorm migration:generate src/migrations/Baseline -d data-source.ts
 *   yarn typeorm migration:run -d data-source.ts
 *   yarn typeorm migration:revert -d data-source.ts
 *
 * Entities are discovered via a glob over the compiled libs/ entity files. We
 * deliberately point at .ts sources so the CLI works without a prior build.
 */
import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

import configuration from "./libs/core/src/app-config/configuration";

const cfg = configuration().database;

export default new DataSource({
  type: "postgres",
  host: cfg.host,
  port: cfg.port,
  username: cfg.username,
  password: cfg.password,
  database: cfg.database,
  // CLI: load entity .ts sources directly so we don't require a build step
  // before generating a migration.
  entities: ["libs/**/*.entity.ts"],
  migrations: ["src/migrations/*.ts"],
  migrationsTableName: "migrations",
  // Never let the CLI auto-sync or auto-run; everything must be explicit.
  synchronize: false,
  migrationsRun: false,
  logging: ["error", "schema", "migration"],
});
