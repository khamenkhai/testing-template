# Agent Guide for nest-prisma-starter

## Dev Commands

| Command                               | Action                                            |
| ------------------------------------- | ------------------------------------------------- |
| `npm run start:dev`                   | Dev server with watch                             |
| `npm run build`                       | Build (deletes dist first — `deleteOutDir: true`) |
| `npm run lint`                        | ESLint with `--fix`                               |
| `npm test`                            | Unit tests (`*.spec.ts`)                          |
| `npm run test:e2e`                    | E2E tests (`*.e2e-spec.ts`)                       |
| `npm run format`                      | Prettier write                                    |
| `npm run db:seed`                     | Seed DB via ts-node                               |
| `npm run migration:generate --name=X` | Generate migration (uses `$npm_config_name`)      |
| `npm run migration:run`               | Apply pending migrations                          |
| `npm run migration:revert`            | Revert last migration                             |
| `npm run migration:refresh`           | Drop schema → migrate → seed                      |

## Architecture

- **NestJS 11** + **prisma 0.3** + **PostgreSQL**. Single app, not a monorepo.
- Entrypoint: `src/main.ts`. Root module: `src/app.module.ts`.
- Global prefix: `/api`. Routes nested under `/v1` via `RouterModule`.
  - `POST /api/v1/auth/login` — login
  - `GET /api/v1/todo` — todos (JWT)
  - `GET /api/v1/admin/users`, `/api/v1/admin/roles` — admin (JWT)
- Static files served at `/files` from `public/uploads`.
- Swagger: `/swagger`. Scalar: `/reference`. Both dev-only.

## Database & Migrations

- `synchronize: false` — schema changes **must** go through migrations.
- `src/database/migrations/` is **gitignored** — migrations are local artifacts.
- Data source config: `src/database/data-source.ts`. Override env for local vs Docker (`DB_HOST=localhost` vs `DB_HOST=db`).
- In Docker: `docker exec -it nest-api npm run migration:generate --name=X`.

## Entity Conventions

- UUID primary keys (`@id @default(uuid(7))`).
- Plural snake_case table names (`@@map("users")`).
- Sensitive columns: Use `select` in queries to omit `password`, `refreshToken` — see `UsersService.safeUserSelect`.
- `createdAt` / `updatedAt` via `@default(now())` / `@updatedAt`.

## Testing

- **Unit**: jest, config in `package.json` (`rootDir: src`, matches `*.spec.ts`).
- **E2E**: jest with config `test/jest-e2e.json`, matches `*.e2e-spec.ts`.
- E2E tests import `AppModule` directly — require a running PostgreSQL instance.
- Unit specs use `Test.createTestingModule` with only the providers under test.

## Globals

- **ValidationPipe**: `whitelist`, `forbidNonWhitelisted`, `transform`.
- **ThrottlerGuard** (global): 3 req/short (1s), 60 req/medium (60s), 2000 req/day.
- **ApiResponseInterceptor** (global response wrapper).
- **SentryGlobalFilter** (global error filter).
- Winston logger wired as Nest logger via `WINSTON_MODULE_NEST_PROVIDER`.

## Docker

- `docker compose up --build` starts API + Postgres.
- Dockerfile `CMD` is `npm run start:dev`.
- compose.yaml uses `env_file: .env` and Dockerfile `develop.watch` for hot reload.
- Run migration/seed commands inside the container with `docker exec -it nest-api ...`.

## Tooling

- **Prettier**: `singleQuote: true`, `trailingComma: all`.
- **ESLint**: TypeScript strict checking, `no-explicit-any: off`, `no-floating-promises: warn`.
- TypeScript: `module: nodenext`, `moduleResolution: nodenext`, decorators enabled.
