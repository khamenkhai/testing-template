# NestJS Prisma Template — Project Guide

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Directory Structure](#2-directory-structure)
3. [How the App Boots](#3-how-the-app-boots)
4. [Routing & Module Registration](#4-routing--module-registration)
5. [Database Layer (Prisma)](#5-database-layer-prisma)
6. [Authentication & Authorization Flow](#6-authentication--authorization-flow)
7. [How to Create Request DTOs](#7-how-to-create-request-dtos)
8. [How to Return Responses](#8-how-to-return-responses)
9. [Guards](#9-guards)
10. [Interceptors](#10-interceptors)
11. [Filters](#11-filters)
12. [Middleware](#12-middleware)
13. [Decorators](#13-decorators)
14. [File Upload Flow](#14-file-upload-flow)
15. [Seeders](#15-seeders)
16. [Environment Variables](#16-environment-variables)
17. [How to Create a New Module](#17-how-to-create-a-new-module)

---

## 1. Project Architecture

This is a **NestJS 11** application using **Prisma 7** as the ORM for **PostgreSQL**. It follows the standard NestJS modular architecture with a single-app (non-monorepo) structure.

**Technology Stack:**

| Layer          | Technology                                                    |
| -------------- | ------------------------------------------------------------- |
| Runtime        | Node.js (NestJS 11)                                           |
| Language       | TypeScript 5                                                  |
| ORM            | Prisma 7 (via `@prisma/client` + `@prisma/adapter-pg`)        |
| Database       | PostgreSQL                                                    |
| Auth           | Passport (JWT) + bcrypt                                       |
| File Storage   | AWS S3 / MinIO                                                |
| Validation     | class-validator + class-transformer (global `ValidationPipe`) |
| API Docs       | Swagger (`/swagger`) + Scalar (`/reference`)                  |
| Logging        | Winston (console + daily rotate files)                        |
| Error Tracking | Sentry                                                        |
| Rate Limiting  | @nestjs/throttler                                             |

**Architecture Layers (NestJS flow):**

```
Request
  → Middleware (HttpLoggerMiddleware)
    → Guards (ThrottlerGuard, JwtAuthGuard, PermissionsGuard)
      → Interceptors (ApiResponseInterceptor)
        → Route Handler (Controller)
          → Service (business logic)
            → PrismaService (database)
  ← Response back through the chain
  ← Filters catch exceptions (PrismaClientExceptionFilter, SentryGlobalFilter)
```

---

## 2. Directory Structure

```
src/
├── main.ts                        # Entrypoint
├── app.module.ts                  # Root module — wires everything
│
├── common/                        # Shared utilities
│   ├── config/
│   │   └── multer.config.ts       # Multer file upload config
│   ├── decorators/
│   │   ├── api-response.decorator.ts       # @ApiSwaggerSingleResponse, List, Paginated
│   │   └── response-message.decorator.ts
│   ├── dto/
│   │   └── pagination.dto.ts      # Reusable pagination query params
│   ├── interceptor/
│   │   └── api-response.interceptor.ts  # Global response wrapper
│   ├── interfaces/
│   │   └── api-response.interface.ts    # Response type definitions
│   ├── logger/
│   │   ├── logger.module.ts        # Winston setup
│   │   └── http-logger.middleware.ts
│   ├── prisma/
│   │   ├── prisma.module.ts        # Global Prisma module
│   │   └── prisma.service.ts       # PrismaClient wrapper
│   └── utils/
│       └── prisma-exception.filter.ts  # Prisma errors → HTTP errors
│
├── database/
│   ├── generated/prisma/           # Auto-generated Prisma client (gitignored)
│   └── seeders/
│       └── seed.ts                 # Standalone seed script
│
├── modules/                        # Feature modules
│   ├── auth/                       # Authentication & Authorization
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── decorators/
│   │   │   ├── get-user.decorator.ts
│   │   │   └── permission.decorator.ts
│   │   ├── dto/
│   │   │   ├── auth-response.dto.ts
│   │   │   ├── register-user.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   └── refresh.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── permission.guard.ts
│   │   ├── jwt/
│   │   │   └── jwt.strategy.ts
│   │   └── types/
│   │       ├── auth-request.interface.ts
│   │       └── jwt-payload.ts
│   │
│   ├── todo/                       # Todo CRUD
│   │   ├── todo.module.ts
│   │   ├── todo.controller.ts
│   │   ├── todo.service.ts
│   │   └── dto/
│   │       ├── todo-response.dto.ts
│   │       ├── create-todo.dto.ts
│   │       ├── update-todo.dto.ts
│   │       └── todo-query.dto.ts
│   │
│   ├── users/                      # User management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │       ├── users-response.dto.ts
│   │       ├── create-user.dto.ts
│   │       ├── update-user.dto.ts
│   │       └── user-filter.dto.ts
│   │
│   ├── roles/                      # Role & Permission management
│   │   ├── roles.module.ts
│   │   ├── roles.controller.ts
│   │   ├── roles.service.ts
│   │   └── dto/
│   │       ├── roles-response.dto.ts
│   │       ├── role-response.dto.ts
│   │       └── roles.dto.ts
│   │
│   └── upload/                     # File upload service (no controller)
│       ├── upload.module.ts
│       └── upload.service.ts
│
prisma/
├── schema.prisma                   # Database schema definition
└── migrations/                     # Migration files (gitignored)
```

---

## 3. How the App Boots

Flow in `src/main.ts`:

```typescript
async function bootstrap() {
  // 1. Create NestJS app with bufferLogs for Winston
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // 2. Replace default NestJS logger with Winston
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // 3. Serve static files from public/
  app.useStaticAssets(path.join(process.cwd(), 'public'));

  // 4. Enable CORS (all origins)
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 5. Set global prefix: /api (root path excluded)
  app.setGlobalPrefix('api', { exclude: ['/'] });

  // 6. Register global ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true, // Auto-transform to DTO instances
    }),
  );

  // 7. Setup Swagger + Scalar (dev only)

  // 8. Register global Prisma exception filter
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  // 9. Listen on PORT (default 3000)
  await app.listen(port);
}
```

**Global providers** registered in `app.module.ts`:

| Provider                 | Scope             | Purpose                                             |
| ------------------------ | ----------------- | --------------------------------------------------- |
| `ThrottlerGuard`         | `APP_GUARD`       | Rate limiting (3/short, 60/medium, 2000/long)       |
| `ApiResponseInterceptor` | `APP_INTERCEPTOR` | Wraps all responses in `{ success, message, data, timestamp, path }` |
| `SentryGlobalFilter`     | `APP_FILTER`      | Sends exceptions to Sentry                          |
| `HttpLoggerMiddleware`   | Middleware        | Logs HTTP requests via Winston                      |

---

## 4. Routing & Module Registration

Routing is defined in `app.module.ts` using `RouterModule`:

```
/api
  /v1
    /auth              → AuthModule
    /todo              → TodoModule
    /upload            → UploadModule (no routes — service only)
    /admin
      /users           → UsersModule
      /roles           → RolesModule
```

**Full Route Map:**

| Method | Path                                                    | Auth | Permission    | Handler                              |
| ------ | ------------------------------------------------------- | ---- | ------------- | ------------------------------------ |
| POST   | `/api/v1/auth/register`                                 | —    | —             | `AuthController.register`            |
| POST   | `/api/v1/auth/login`                                    | —    | —             | `AuthController.login`               |
| POST   | `/api/v1/auth/refresh`                                  | —    | —             | `AuthController.refresh`             |
| POST   | `/api/v1/auth/logout`                                   | JWT  | —             | `AuthController.logout`              |
| GET    | `/api/v1/auth/profile`                                  | JWT  | —             | `AuthController.getProfile`          |
| POST   | `/api/v1/todo`                                          | JWT  | `todo.create` | `TodoController.create`              |
| GET    | `/api/v1/todo`                                          | JWT  | `todo.read`   | `TodoController.findAll`             |
| GET    | `/api/v1/todo/:id`                                      | JWT  | `todo.read`   | `TodoController.findOne`             |
| PATCH  | `/api/v1/todo/:id`                                      | JWT  | `todo.update` | `TodoController.update`              |
| DELETE | `/api/v1/todo/:id`                                      | JWT  | `todo.delete` | `TodoController.remove`              |
| POST   | `/api/v1/todo/with-image`                               | JWT  | `todo.create` | `TodoController.createWithImage`     |
| POST   | `/api/v1/admin/users`                                   | JWT  | —             | `UsersController.create`             |
| GET    | `/api/v1/admin/users`                                   | JWT  | —             | `UsersController.findAll`            |
| GET    | `/api/v1/admin/users/:id`                               | JWT  | —             | `UsersController.findOne`            |
| PATCH  | `/api/v1/admin/users/:id`                               | JWT  | —             | `UsersController.update`             |
| DELETE | `/api/v1/admin/users/:id`                               | JWT  | —             | `UsersController.remove`             |
| POST   | `/api/v1/admin/roles`                                   | JWT  | —             | `RolesController.createRole`         |
| GET    | `/api/v1/admin/roles`                                   | JWT  | —             | `RolesController.findAllRoles`       |
| GET    | `/api/v1/admin/roles/:id`                               | JWT  | —             | `RolesController.findOneRole`        |
| PATCH  | `/api/v1/admin/roles/:id`                               | JWT  | —             | `RolesController.updateRole`         |
| DELETE | `/api/v1/admin/roles/:id`                               | JWT  | —             | `RolesController.deleteRole`         |
| GET    | `/api/v1/admin/roles/permissions/all`                   | JWT  | —             | `RolesController.findAllPermissions` |
| DELETE | `/api/v1/admin/roles/:roleId/permissions/:permissionId` | JWT  | —             | `RolesController.removePermission`   |

**Static files**: served at `/files` from `public/uploads/` (via `ServeStaticModule`).

**Module Registration Pattern** — Each module:

```typescript
@Module({
  imports: [...],       // Other modules this module depends on
  controllers: [...],   // Route handlers
  providers: [...],     // Services, guards, etc.
  exports: [...],       // Services to share with other modules
})
export class SomeModule {}
```

---

## 5. Database Layer (Prisma)

### Prisma Schema (`prisma/schema.prisma`)

**Models:**

| Model            | Table              | Key Fields                                                              |
| ---------------- | ------------------ | ----------------------------------------------------------------------- |
| `Permission`     | `permissions`      | `id` (UUID v7), `name` (unique), `description?`                        |
| `Role`           | `roles`            | `id` (UUID v7), `name` (unique)                                        |
| `RolePermission` | `role_permission`  | `id`, `roleId` (FK→roles, cascade), `permissionId` (FK→permissions, cascade) |
| `User`           | `users`            | `id` (UUID v7), `username`, `email` (unique), `password?`, `refreshToken?`, `roleId?` (FK), `isDeleted`, timestamps |
| `Todo`           | `todos`            | `id` (UUID v7), `title`, `description?`, `isCompleted`, `image?`, `userId?` (FK), `isDeleted`, timestamps |

**Conventions:**

- All tables use **plural snake_case** names (`@@map("users")`)
- All IDs are **UUID v7** (`@default(uuid(7))`)
- Column mapping via `@map("snake_case")`
- Timestamps: `createdAt`/`updatedAt` with `@map("created_at")`/`@map("updated_at")`
- Soft delete flag: `isDeleted` with `@default(false)`

### PrismaService (`src/common/prisma/prisma.service.ts`)

```typescript
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
```

- Uses **driver adapters** pattern (`@prisma/adapter-pg`)
- `PrismaModule` is **global** (`@Global()`) — no need to import in feature modules

### How to Query in a Service

All services use a `private readonly baseSelect` to define the exact response shape. Every Prisma query uses `select: this.baseSelect`:

```typescript
// Base select — define once, use everywhere
private readonly baseSelect = {
  id: true,
  title: true,
  description: true,
  isCompleted: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      username: true,
      email: true,
    },
  },
} as const;

// Find one with baseSelect
const item = await this.prisma.todo.findFirst({
  where: { id, userId },
  select: this.baseSelect,
});

// Create with baseSelect
const created = await this.prisma.todo.create({
  data: { title, user: { connect: { id: user.id } } },
  select: this.baseSelect,
});

// Paginated query with baseSelect
const [items, totalItems] = await Promise.all([
  this.prisma.todo.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
    select: this.baseSelect,
  }),
  this.prisma.todo.count({ where: { userId } }),
]);

// Cast result as response DTO
return { data: created as TodoResponseDto };
```

### PrismaException Filter (`src/common/utils/prisma-exception.filter.ts`)

Maps Prisma error codes to HTTP responses:

| Prisma Code | HTTP Status       | Meaning                     |
| ----------- | ----------------- | --------------------------- |
| `P2002`     | `409 Conflict`    | Unique constraint violation |
| `P2003`     | `400 Bad Request` | Foreign key violation       |
| `P2025`     | `404 Not Found`   | Record not found            |

---

## 6. Authentication & Authorization Flow

### Registration

```
POST /api/v1/auth/register
Body: { email, username, password }
```

1. Check if user already exists → throw `BadRequestException` if yes
2. Hash password with bcrypt (10 rounds)
3. Find or create `admin` role with all permissions
4. Create user with `admin` role
5. Return user data and role

### Login

```
POST /api/v1/auth/login
Body: { email, password }
```

1. Fetch user with `role → rolePermissions → permission` nested include
2. Verify password with `bcrypt.compare`
3. Build JWT payload:
   ```typescript
   { sub, email, roleId, roleName, permissions: string[] }
   ```
4. Sign **access token** (`JWT_ACCESS_SECRET`, configured via `JWT_ACCESS_EXPIRATION`, fallback `15m`)
5. Sign **refresh token** (`JWT_REFRESH_SECRET`, payload only `{ sub }`, fallback `7d`)
6. Hash refresh token and store in `user.refreshToken`
7. Return `{ access_token, refresh_token, user: { id, email, roleId, roleName, permissions } }`

### Token Refresh

```
POST /api/v1/auth/refresh
Body: { refreshToken }
```

1. Verify refresh token signature
2. Fetch user with permissions
3. Compare provided token with hashed token in DB (bcrypt.compare)
4. Issue new access + refresh token pair
5. Store new hashed refresh token

### JWT Verification (on every protected route)

1. `JwtAuthGuard` triggers Passport `JwtStrategy`
2. Strategy extracts Bearer token from `Authorization` header
3. Verifies against `JWT_ACCESS_SECRET`
4. `validate(payload)` returns `AuthenticatedUser` attached to `request.user`:
   ```typescript
   { id, email, roleId, roleName, permissions: string[] }
   ```

### Permission Check

1. `@RequirePermissions('todo.read')` decorator sets metadata
2. `PermissionsGuard` reads metadata, checks `user.permissions` array
3. Throws 403 `ForbiddenException` if any permission is missing

### Logout

```
POST /api/v1/auth/logout (JWT required)
```

Clears `refreshToken` field for the user in DB.

### AuthenticatedUser Object (available on `request.user`)

```typescript
class AuthenticatedUser {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}
```

---

## 7. How to Create Request DTOs

DTOs are classes in a module's `dto/` folder. They use `class-validator` decorators for validation and `@nestjs/swagger` decorators for API documentation.

### Basic DTO Pattern

```typescript
// src/modules/your-module/dto/create-something.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateSomethingDto {
  @ApiProperty({
    example: 'Sample name',
    description: 'The name of the something',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 5,
    description: 'Quantity of the item',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;
}
```

### Update DTO (Partial)

Use `PartialType` from `@nestjs/swagger` to make all fields optional:

```typescript
// src/modules/your-module/dto/update-something.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateSomethingDto } from './create-something.dto';

export class UpdateSomethingDto extends PartialType(CreateSomethingDto) {}
```

### Available Validation Decorators

| Decorator           | Usage                                                 |
| ------------------- | ----------------------------------------------------- |
| `@IsString()`       | Must be string                                        |
| `@IsNotEmpty()`     | Not empty                                             |
| `@IsOptional()`     | Field may be omitted                                  |
| `@IsEmail()`        | Must be valid email                                   |
| `@IsInt()`          | Must be integer                                       |
| `@IsUUID()`         | Must be UUID                                          |
| `@IsBoolean()`      | Must be boolean                                       |
| `@Min(n)`           | Minimum value                                         |
| `@Max(n)`           | Maximum value                                         |
| `@MinLength(n)`     | Minimum string length                                 |
| `@IsArray()`        | Must be array                                         |
| `@ArrayNotEmpty()`  | Array must not be empty                               |
| `@Transform(fn)`    | Transform value at runtime (from `class-transformer`) |
| `@Type(() => Type)` | Type hint for nested transforms                       |

### Swagger Decorators for DTOs

```typescript
@ApiProperty({ example: 'value', description: '...', required: false })
```

For file uploads in Swagger:

```typescript
@ApiProperty({ type: 'string', format: 'binary', required: false })
```

### Pagination DTO (Reusable)

Located at `src/common/dto/pagination.dto.ts`:

```typescript
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;
}
```

Use in controller:

```typescript
@Get()
async findAll(@Query() paginationDto: PaginationDto) { ... }
```

### Query DTOs with `isDeleted` Filter

Each module has a **query DTO** extending `PaginationDto` with an `isDeleted` filter:

```typescript
export class TodoQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by soft-deleted status. Default: false (active only).' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isDeleted?: boolean;
}
```

**Behavior:**
- `?isDeleted=true` → returns only soft-deleted records
- `?isDeleted=false` → returns only active records
- Omitted → defaults to `false` (active only)

**Existing query DTOs:**

| Module | Query DTO      | Location                                    |
| ------ | -------------- | ------------------------------------------- |
| Roles  | `RoleQueryDto` | `src/modules/roles/dto/roles.dto.ts`        |
| Users  | `UserFilterDto`| `src/modules/users/dto/user-filter.dto.ts`  |
| Todos  | `TodoQueryDto` | `src/modules/todo/dto/todo-query.dto.ts`    |

### DTOs in Existing Modules

| Module | DTO                | Fields                                                                                         |
| ------ | ------------------ | ---------------------------------------------------------------------------------------------- |
| Auth   | `RegisterUserDto`  | `username` (IsString), `email` (IsEmail), `password` (MinLength 6)                            |
| Auth   | `LoginDto`         | `email` (IsEmail), `password` (IsString)                                                       |
| Auth   | `RefreshDto`       | `refreshToken` (IsString)                                                                      |
| Users  | `CreateUserDto`    | `username` (IsString), `email` (IsEmail), `password` (MinLength 6), `roleId?` (IsUUID)        |
| Users  | `UpdateUserDto`    | `username?`, `email?`, `password?`, `roleId?`                                                  |
| Todo   | `CreateTodoDto`    | `title` (IsString), `description?` (IsString), `isCompleted?` (IsBoolean), `image?` (any)     |
| Todo   | `UpdateTodoDto`    | `PartialType(CreateTodoDto)`                                                                   |
| Roles  | `CreateRoleDto`    | `name` (IsString), `permissions?` (IsArray of IsUUID)                                         |
| Roles  | `UpdateRoleDto`    | `PartialType(CreateRoleDto)`                                                                   |

### Global ValidationPipe Behavior

```typescript
new ValidationPipe({
  whitelist: true, // Strips unknown properties
  forbidNonWhitelisted: true, // Throws error on unknown properties
  transform: true, // Auto-transforms to DTO instances
});
```

---

## 8. How to Return Responses

### The Global Response Shape

Every successful response is automatically wrapped by `ApiResponseInterceptor` into:

```json
{
  "success": true,
  "message": "Custom message or 'Request successful'",
  "data": { ... },
  "timestamp": "2026-07-06T08:30:00.000Z",
  "path": "/api/v1/admin/users"
}
```

For paginated responses, the service returns `{ data, meta }` and the interceptor preserves both:

```json
{
  "success": true,
  "message": "Fetched All Todos Successfully",
  "data": [ ... ],
  "meta": {
    "totalItems": 50,
    "itemCount": 10,
    "itemsPerPage": 10,
    "totalPages": 5,
    "currentPage": 1
  },
  "timestamp": "2026-07-06T08:30:00.000Z",
  "path": "/api/v1/todo?page=1&limit=10"
}
```

### Setting Custom Messages

Use the `@ResponseMessage()` decorator on controller methods:

```typescript
@Post()
@ResponseMessage('Created Todo Successfully!')
async create(@Body() createTodoDto: CreateTodoDto) { ... }
```

### Paginated Response Pattern

Service returns object with `data` + `meta` shape:

```typescript
// In service — using query DTO with isDeleted filter
async findAll(query: YourModelQueryDto): Promise<PaginatedResponse<YourModelResponseDto>> {
  const { page, limit, isDeleted } = query;
  const skip = (page - 1) * limit;
  const where = { isDeleted: isDeleted ?? false };
  const [items, totalItems] = await Promise.all([
    this.prisma.yourModel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      select: this.baseSelect,
    }),
    this.prisma.yourModel.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: items as YourModelResponseDto[],
    meta: {
      totalItems,
      itemCount: items.length,
      itemsPerPage: limit,
      totalPages,
      currentPage: page,
    },
  };
}
```

### Type Definitions

```typescript
export interface SingleResponse<T> {
  data: T;
}

export interface ListResponse<T> {
  data: T[];
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

// Paginated response (return this from service)
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

### Error Responses

Errors are handled by:

1. **NestJS exceptions** — thrown from services/controllers:
   - `NotFoundException` → 404
   - `BadRequestException` → 400
   - `UnauthorizedException` → 401
   - `ForbiddenException` → 403
   - `ConflictException` → 409

2. **PrismaClientExceptionFilter** — catches Prisma errors:
   - `P2002` → 409 Conflict (unique constraint)
   - `P2003` → 400 Bad Request (foreign key)
   - `P2025` → 404 Not Found

3. **SentryGlobalFilter** — catches everything else (sends to Sentry)

---

## 9. Guards

### JwtAuthGuard

`src/modules/auth/guards/jwt-auth.guard.ts`

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- Extends Passport's JWT auth guard
- Use with `@UseGuards(JwtAuthGuard)` on controllers or methods
- Validates Bearer token from `Authorization` header
- Attaches `AuthenticatedUser` to `request.user`

### PermissionsGuard

`src/modules/auth/guards/permission.guard.ts`

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) return true; // No permissions required → allow

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.permissions) throw new ForbiddenException();

    const hasAllPermissions = requiredPermissions.every((required) =>
      user.permissions.includes(required),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Missing permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
```

- Reads required permissions from `@RequirePermissions()` decorator
- Checks `user.permissions` array (from JWT payload)
- Throws 403 if any required permission is missing
- If no permissions required → allows request

### How to Use Guards Together

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('')
export class TodoController {
  @Get(':id')
  @RequirePermissions('todo.read')
  async findOne(@Param('id') id: string, @Request() req) { ... }
}
```

### ThrottlerGuard (Global)

Registered as `APP_GUARD` — rate limits:

| Name   | Window     | Max Requests |
| ------ | ---------- | ------------ |
| short  | 1 second   | 3            |
| medium | 60 seconds | 60           |
| long   | 24 hours   | 2000         |

---

## 10. Interceptors

### ApiResponseInterceptor

`src/common/interceptor/api-response.interceptor.ts`

- Registered as `APP_INTERCEPTOR` (global)
- Wraps all controller responses into standardized shape
- Detects paginated vs non-paginated responses

**How it works:**

```typescript
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
  const request = context.switchToHttp().getRequest();
  const path = request.url;
  const responseMessage =
    this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler()) ||
    this.getDefaultMessageForMethod(request.method);

  return next.handle().pipe(
    map((res) => {
      if (res && typeof res === 'object' && 'data' in res) {
        return {
          success: true,
          message: responseMessage,
          data: res.data,
          ...('meta' in res ? { meta: res.meta } : {}),
          timestamp: new Date().toISOString(),
          path,
        };
      }
      return {
        success: true,
        message: responseMessage,
        data: res,
        timestamp: new Date().toISOString(),
        path,
      };
    }),
  );
}
```

The interceptor wraps any response that already has a `data` property, preserving `meta` for paginated results. It adds `timestamp` (ISO string) and `path` (request URL) to every response. Falls back to a default message per HTTP method if no `@ResponseMessage()` decorator is set.

---

## 11. Filters

### PrismaClientExceptionFilter

`src/common/utils/prisma-exception.filter.ts`

- Registered in `main.ts` via `app.useGlobalFilters()`
- Catches `Prisma.PrismaClientKnownRequestError`
- Maps error codes to HTTP responses

### SentryGlobalFilter

- Registered in `app.module.ts` via `APP_FILTER`
- Sends all unhandled exceptions to Sentry

---

## 12. Middleware

### HttpLoggerMiddleware

`src/common/logger/http-logger.middleware.ts`

- Registered in `app.module.ts` via `consumer.apply(HttpLoggerMiddleware).forRoutes('*')`
- Logs every HTTP request on response finish:
  ```
  GET /api/v1/todo 200 15ms 1024
  POST /api/v1/auth/login 401 3ms 48
  ```
- Status-based log levels: 5xx → error, 4xx → warn, else → info
- Uses Winston logger (injected via `WINSTON_MODULE_PROVIDER`)

### Logger Module

`src/common/logger/logger.module.ts`

- Configures Winston with:
  - Console transport (colorized in dev, JSON in production)
  - Daily rotate file for all logs (`logs/app-%DATE%.log`, 14 days)
  - Daily rotate file for errors (`logs/error-%DATE%.log`, 30 days)
  - Separate files for uncaught exceptions and rejections
- Log level: `LOG_LEVEL` env var, `debug` in dev, `info` in production

---

## 13. Decorators

### @ResponseMessage(message)

`src/common/decorators/response-message.decorator.ts`

```typescript
export const RESPONSE_MESSAGE = 'response_message';
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE, message);
```

Sets a custom message for the API response. Read by `ApiResponseInterceptor`.

### @RequirePermissions(...permissions)

`src/modules/auth/decorators/permission.decorator.ts`

```typescript
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

Marks a route handler with required permission strings. Read by `PermissionsGuard`.

### @GetUser(data?)

`src/modules/auth/decorators/get-user.decorator.ts`

```typescript
export const GetUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

Custom parameter decorator to extract `request.user` (or a specific property).

```typescript
// Get full user
@GetUser() user: AuthenticatedUser

// Get specific property
@GetUser('id') userId: string
```

---

## 14. File Upload Flow

### Configuration

`src/common/config/multer.config.ts`

- Supports local disk or cloud (memory) storage
- Allowed types: JPEG, PNG, GIF
- Max file size: 10 MB
- File names are sanitized (replace special chars, add unique suffix)

### Upload Service

`src/modules/upload/upload.service.ts`

- Uses AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `@aws-sdk/s3-request-presigner`)
- Supports both **AWS S3** and **MinIO** (detected via `STORAGE_PROVIDER=minio`)
- Methods: `uploadFile`, `getPresignedUrl`, `getPublicUrl`, `deleteFile`, `deleteFiles`, `updateFile`, `fileExists`, `getStorageType`

### Upload in Controller

```typescript
@Post('with-image')
@UseInterceptors(FileInterceptor('image', multerOptions))
@ResponseMessage('Created Todo with Image Successfully')
async createWithImage(
  @UploadedFile() file: Express.Multer.File,
  @Body() createTodoDto: CreateTodoDto,
  @Request() req,
) {
  return this.todoService.createWithImage(createTodoDto, req.user, file);
}
```

### Flow with Cloud Storage

1. Multer stores file in **memory** (`memoryStorage()`)
2. Service uploads to S3/MinIO using `uploadService.uploadFile()`
3. Returns `{ key }` — stored in DB as `todo.image`
4. On read, generates **presigned URL** via `uploadService.getPresignedUrl(key)`
5. Returns presigned URL to client

---

## 15. Seeders

### Standalone Seed Script

`src/database/seeders/seed.ts`

Run via: `npm run db:seed`

**What gets seeded:**

- **12 permissions** across 3 resource groups:
  - `user.create`, `user.read`, `user.update`, `user.delete`
  - `role.create`, `role.read`, `role.update`, `role.delete`
  - `todo.create`, `todo.read`, `todo.update`, `todo.delete`
- **admin** role linked to ALL 12 permissions
- **admin user**: `admin@example.com` / `Password123!` with admin role

### Migration + Seed Refresh

To reset the database: `npx prisma migrate reset` (drops schema, re-applies migrations, runs seed).

---

## 16. Environment Variables

| Variable                 | Default                      | Purpose                            |
| ------------------------ | ---------------------------- | ---------------------------------- |
| `NODE_ENV`               | `development`                | Controls Swagger, log format, etc. |
| `PORT`                   | `3000`                       | HTTP listen port                   |
| `DATABASE_URL`           | —                            | PostgreSQL connection string       |
| `JWT_ACCESS_SECRET`      | —                            | Access token signing key           |
| `JWT_REFRESH_SECRET`     | —                            | Refresh token signing key          |
| `JWT_ACCESS_EXPIRATION`  | `172800000` (2d)             | Access token TTL (ms)              |
| `JWT_REFRESH_EXPIRATION` | `604800000` (7d)             | Refresh token TTL (ms)             |
| `STORAGE_PROVIDER`       | —                            | `minio` or `s3`                    |
| `AWS_S3_REGION`          | —                            | S3 region                          |
| `AWS_ACCESS_KEY_ID`      | —                            | S3/MinIO access key                |
| `AWS_SECRET_ACCESS_KEY`  | —                            | S3/MinIO secret key                |
| `AWS_S3_BUCKET`          | —                            | Bucket name                        |
| `MINIO_ENDPOINT`         | —                            | MinIO server URL                   |
| `LOG_LEVEL`              | `debug` (dev), `info` (prod) | Winston log level                  |
| `DB_USER`                | —                            | PostgreSQL user (compose.yaml)     |
| `DB_PASS`                | —                            | PostgreSQL password (compose.yaml) |
| `DB_NAME`                | —                            | PostgreSQL database (compose.yaml) |
| `MINIO_ROOT_USER`        | `minioadmin`                 | MinIO admin username               |
| `MINIO_ROOT_PASSWORD`    | `minioadmin`                 | MinIO admin password               |

---

## 17. How to Create a New Module

Follow these steps to add a new feature module.

### Step 1: Create Module Files

```
src/modules/your-feature/
├── your-feature.module.ts
├── your-feature.controller.ts
├── your-feature.service.ts
└── dto/
    ├── create-your-feature.dto.ts
    └── update-your-feature.dto.ts
```

### Step 2: Define DTOs

```typescript
// dto/create-your-feature.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateYourFeatureDto {
  @ApiProperty({ example: 'Item name', description: 'The name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
```

```typescript
// dto/update-your-feature.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateYourFeatureDto } from './create-your-feature.dto';
export class UpdateYourFeatureDto extends PartialType(CreateYourFeatureDto) {}
```

### Step 3: Create Service

```typescript
// your-feature.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateYourFeatureDto } from './dto/create-your-feature.dto';
import { UpdateYourFeatureDto } from './dto/update-your-feature.dto';

@Injectable()
export class YourFeatureService {
  constructor(private prisma: PrismaService) {}

  private readonly baseSelect = {
    id: true,
    name: true,
    description: true,
    createdAt: true,
  } as const;

  async create(dto: CreateYourFeatureDto) {
    return this.prisma.yourModel.create({
      data: dto,
      select: this.baseSelect,
    });
  }

  async findAll() {
    return this.prisma.yourModel.findMany({
      select: this.baseSelect,
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.yourModel.findUnique({
      where: { id },
      select: this.baseSelect,
    });
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }

  async update(id: string, dto: UpdateYourFeatureDto) {
    await this.findOne(id);
    return this.prisma.yourModel.update({
      where: { id },
      data: dto,
      select: this.baseSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.yourModel.delete({
      where: { id },
      select: this.baseSelect,
    });
  }
}
```

**Key pattern**: Define a single `private readonly baseSelect` that lists every field (and nested relation) the client needs. Every Prisma query uses `select: this.baseSelect` — no `mapModel()` helper needed. Cast results as the response DTO type.

### Step 4: Create Controller

```typescript
// your-feature.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { YourFeatureService } from './your-feature.service';
import { CreateYourFeatureDto } from './dto/create-your-feature.dto';
import { UpdateYourFeatureDto } from './dto/update-your-feature.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';

@ApiTags('Your Feature')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('')
export class YourFeatureController {
  constructor(private readonly service: YourFeatureService) {}

  @Post()
  @ResponseMessage('Created successfully')
  create(@Body() dto: CreateYourFeatureDto) {
    return this.service.create(dto);
  }

  @Get()
  @ResponseMessage('Fetched all successfully')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ResponseMessage('Fetched successfully')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateYourFeatureDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Deleted successfully')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

### Step 5: Create and Register the Module

```typescript
// your-feature.module.ts
import { Module } from '@nestjs/common';
import { YourFeatureService } from './your-feature.service';
import { YourFeatureController } from './your-feature.controller';

@Module({
  controllers: [YourFeatureController],
  providers: [YourFeatureService],
})
export class YourFeatureModule {}
```

### Step 6: Register in App Module

```typescript
// app.module.ts — add to imports array
import { YourFeatureModule } from './modules/your-feature/your-feature.module';

@Module({
  imports: [
    // ... existing imports ...
    YourFeatureModule,
    RouterModule.register([
      {
        path: 'v1',
        children: [
          // ... existing routes ...
          { path: 'your-feature', module: YourFeatureModule },
        ],
      },
    ]),
  ],
})
```

### Step 7: Add Prisma Model (if new table)

Update `prisma/schema.prisma`:

```prisma
model YourModel {
  id          String   @id @default(uuid(7))
  name        String   @db.VarChar(255)
  description String?  @db.Text
  isDeleted   Boolean  @default(false) @map("is_deleted")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  userId      String?  @map("user_id")
  user        User?    @relation(fields: [userId], references: [id])

  @@map("your_models")
}
```

Then run `npm run migration:generate --name=add_your_model`.

### Step 8: Add Permissions & Guards (optional)

1. Add permission names in `seed.ts`
2. Re-seed: `npm run db:seed`
3. Use in controller:

```typescript
import { PermissionsGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/decorators/permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
export class YourFeatureController {
  @Get()
  @RequirePermissions('your-feature.read')
  async findAll() { ... }
}
```

---

## Quick Reference

### Common Patterns for Controller Methods

| Pattern     | Decorators                                                                         |
| ----------- | ---------------------------------------------------------------------------------- |
| Create      | `@Post()`, `@Body()`, `@ResponseMessage()`                                         |
| Read All    | `@Get()`, `@Query()`, `@ResponseMessage()`                                         |
| Read One    | `@Get(':id')`, `@Param('id')`, `@ResponseMessage()`                                |
| Update      | `@Patch(':id')`, `@Param('id')`, `@Body()`, `@ResponseMessage()`                   |
| Delete      | `@Delete(':id')`, `@Param('id')`, `@ResponseMessage()`                             |
| File Upload | `@Post()`, `@UseInterceptors(FileInterceptor('field', config))`, `@UploadedFile()` |

### Dependency Injection

```typescript
// Service
@Injectable()
export class MyService {
  constructor(
    private prisma: PrismaService, // Global — no import needed
    private uploadService: UploadService, // From UploadModule
  ) {}
}
```

### Importing Services from Other Modules

The module providing the service must export it in `@Module({ exports: [Service] })`. The importing module must import the provider's module:

```typescript
@Module({
  imports: [UploadModule], // ← import to access UploadService
  controllers: [TodoController],
  providers: [TodoService],
})
export class TodoModule {}
```
