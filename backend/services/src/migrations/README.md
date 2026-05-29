# TypeORM migrations

This folder holds TypeORM migration files. See `backend/services/README.md`
section **Database migrations** for the full workflow (generate / commit /
apply, plus the one-shot safety guard documented in
`libs/core/src/app-config/migration-runner.ts`).

Generated files at runtime are compiled into `dist/migrations/` and that is
where `runMigrationsWithGuard` loads them from in production.
