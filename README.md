# NestJS Prisma Starter Template

A production-ready [NestJS](https://nestjs.com/) starter template with **Prisma ORM**, **PostgreSQL**, **JWT Authentication**, **RBAC** (granular permissions), **MinIO / S3 file uploads**, **Sentry error tracking**, **Winston logging**, **Swagger + Scalar docs**, and **Docker** integration.

---

## Features

- **Core**: NestJS 11, TypeScript 5, Prisma 7 with PostgreSQL adapter
- **Auth**: JWT access/refresh token rotation, Passport strategies, bcrypt password hashing
- **RBAC**: Role-based access control with granular CRUD permissions (`todo.create`, `user.read`, etc.)
- **File Storage**: S3-compatible uploads via MinIO (local) or AWS S3; presigned URLs for secure access
- **API Docs**: Swagger UI (`/swagger`) + Scalar UI (`/reference`) — dev only
- **Security**: Global throttling (3 req/s, 60 req/min, 2000 req/day), Helmet, CORS, ValidationPipe with whitelist
- **Logging**: Winston with daily rotate file, HTTP request logging middleware
- **Error Tracking**: Sentry global exception filter
- **API Response**: Global interceptor wrapping all responses in a consistent envelope
- **Docker**: Full compose stack — API + PostgreSQL 15 + MinIO

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Docker](https://www.docker.com/) & Docker Compose
- [npm](https://www.npmjs.com/)

### Environment

```bash
cp .env.example .env
```

> **Important**: The Docker `compose.yaml` expects `DB_USER`, `DB_PASS`, `DB_NAME` in `.env` (for PostgreSQL service). The `.env.example` uses a `DATABASE_URL` connection string directly. Add these if running via Docker:

```env
DB_USER=postgres
DB_PASS=postgres
DB_NAME=nest_starter
```

For local development, update `DATABASE_URL` in `.env`:

- **Docker**: `postgresql://postgres:postgres@db:5432/nest_starter?schema=public`
- **Local**: `postgresql://postgres:postgres@localhost:5432/nest_starter?schema=public`

### Running with Docker (recommended)

```bash
docker compose up --build
```

This starts the API (`:3000`), PostgreSQL (`:5432`), and MinIO (`:9000` / `:9001` console).

### Running locally

```bash
npm install
npm run prisma:generate
npm run db:seed
npm run start:dev
```

---

## Database

This project uses [Prisma](https://www.prisma.io/) for database access and migrations.

### Schema

Defined in `prisma/schema.prisma`. Models:

| Model            | Table             | Purpose                   |
| ---------------- | ----------------- | ------------------------- |
| `User`           | `users`           | Auth & profile            |
| `Role`           | `roles`           | Roles (e.g. `superadmin`) |
| `Permission`     | `permissions`     | Granular permissions      |
| `RolePermission` | `role_permission` | Many-to-many join         |
| `Todo`           | `todos`           | Example CRUD resource     |

### Migrations

```bash
# Generate a migration after schema changes
npm run prisma:migrate -- --name describe_change

# Apply pending migrations
npx prisma migrate deploy
```

Migrations are stored in `prisma/migrations/` (gitignored in some setups).

### Seed

```bash
npm run db:seed
```

Creates a `superadmin` role with all permissions and an admin user:

- **Email**: `admin@example.com`
- **Password**: `Password123!`

---

## Project Structure

```
src/
├── common/
│   ├── config/           # Multer config, env config
│   ├── decorators/       # @ResponseMessage, @RequirePermissions
│   ├── dto/              # Shared DTOs (Pagination, etc.)
│   ├── interceptor/      # ApiResponseInterceptor (global response wrapper)
│   ├── interfaces/       # PaginatedResponse, API response types
│   ├── logger/           # Winston module + HTTP logger middleware
│   ├── prisma/           # PrismaService (Pg adapter) + PrismaModule
│   └── utils/            # PrismaClientExceptionFilter
├── database/
│   ├── generated/        # Prisma client (generated)
│   └── seeders/          # DB seed script
├── modules/
│   ├── auth/             # Register, login, logout, refresh, JWT guards
│   ├── roles/            # CRUD roles & permissions
│   ├── todo/             # CRUD todos (example resource)
│   ├── upload/           # S3/MinIO file upload service
│   └── users/            # User management (assign role)
├── app.module.ts         # Root module with RouterModule & global providers
└── main.ts               # Entrypoint, Swagger/Scalar setup, global filters
```

---

## API Endpoints

All routes are prefixed with `/api/v1`.

### Auth (`/api/v1/auth`)

| Method | Path        | Description                             | Auth   |
| ------ | ----------- | --------------------------------------- | ------ |
| `POST` | `/register` | Register a new user                     | Public |
| `POST` | `/login`    | Login (returns access + refresh tokens) | Public |
| `POST` | `/refresh`  | Rotate refresh token                    | Public |
| `POST` | `/logout`   | Invalidate refresh token                | JWT    |
| `GET`  | `/profile`  | Get current user profile                | JWT    |

### Todo (`/api/v1/todo`)

| Method   | Path          | Description                               | Auth |
| -------- | ------------- | ----------------------------------------- | ---- |
| `GET`    | `/`           | List user's todos (paginated)             | JWT  |
| `POST`   | `/`           | Create a todo                             | JWT  |
| `POST`   | `/with-image` | Create todo with image upload (multipart) | JWT  |
| `GET`    | `/:id`        | Get todo by ID                            | JWT  |
| `PATCH`  | `/:id`        | Update a todo                             | JWT  |
| `DELETE` | `/:id`        | Delete a todo                             | JWT  |

### Admin — Users (`/api/v1/admin/users`)

| Method  | Path        | Description             | Auth |
| ------- | ----------- | ----------------------- | ---- |
| `PATCH` | `/:id/role` | Assign a role to a user | JWT  |

### Admin — Roles (`/api/v1/admin/roles`)

| Method   | Path                                 | Description                               | Auth |
| -------- | ------------------------------------ | ----------------------------------------- | ---- |
| `GET`    | `/`                                  | List all roles                            | JWT  |
| `POST`   | `/`                                  | Create a role (with optional permissions) | JWT  |
| `GET`    | `/:id`                               | Get role by ID                            | JWT  |
| `PATCH`  | `/:id`                               | Update role & its permissions             | JWT  |
| `DELETE` | `/:id`                               | Delete a role                             | JWT  |
| `GET`    | `/permissions/all`                   | List all available permissions            | JWT  |
| `DELETE` | `/:roleId/permissions/:permissionId` | Remove permission from role               | JWT  |

### File Upload (`/api/v1/upload`)

Upload endpoint is handled via the `UploadService` (no dedicated controller) — used internally by the Todo module's `with-image` flow.

---

## RBAC & Permissions

Permissions follow a `resource.action` convention:

- `todo.create`, `todo.read`, `todo.update`, `todo.delete`
- `user.create`, `user.read`, `user.update`, `user.delete`

Use the `@RequirePermissions()` decorator on controllers:

```ts
@RequirePermissions('todo.update')
@Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateTodoDto) { ... }
```

Combine with `PermissionsGuard` (uses `JwtAuthGuard` first) to protect routes.

---

## File Storage

Supports two providers configured via `STORAGE_PROVIDER` in `.env`:

- **`minio`** (default) — local MinIO instance via Docker
- **`s3`** — AWS S3

### MinIO

Auto-configured in Docker compose with a setup container that creates the bucket. Console: `http://localhost:9001`.

### AWS S3

Set `STORAGE_PROVIDER=s3` and populate `AWS_*` env vars:

```
AWS_S3_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=my-bucket
```

---

## Static Files

Served at `/files` from `public/uploads/` via `ServeStaticModule`.

---

## Tech Stack

| Layer         | Choice                               |
| ------------- | ------------------------------------ |
| Framework     | NestJS 11                            |
| Language      | TypeScript 5                         |
| ORM           | Prisma 7 (with `@prisma/adapter-pg`) |
| Database      | PostgreSQL 15                        |
| Auth          | Passport.js (JWT, local)             |
| Docs          | Swagger + Scalar                     |
| Logging       | Winston (daily rotate)               |
| Errors        | Sentry                               |
| Validation    | class-validator + class-transformer  |
| Storage       | MinIO / AWS S3 (AWS SDK v3)          |
| Rate Limiting | @nestjs/throttler                    |
| Container     | Docker Compose                       |

---

## Scripts

| Command                   | Action                 |
| ------------------------- | ---------------------- |
| `npm run start:dev`       | Dev server with watch  |
| `npm run build`           | Build to `dist/`       |
| `npm run lint`            | ESLint with `--fix`    |
| `npm test`                | Unit tests             |
| `npm run test:e2e`        | E2E tests              |
| `npm run format`          | Prettier               |
| `npm run db:seed`         | Seed database          |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate`  | Run dev migration      |
| `npm run prisma:studio`   | Open Prisma Studio     |

---

## License

UNLICENSED
