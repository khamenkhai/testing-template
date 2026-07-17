# AI Module Creation Guide

This document is a step-by-step reference for creating new NestJS feature modules in this project. Follow every section in order — each layer builds on the previous one.

---

## Table of Contents

1. [File Structure](#1-file-structure)
2. [Prisma Model](#2-prisma-model)
3. [Request DTOs](#3-request-dtos)
4. [Response DTO](#4-response-dto)
5. [Service](#5-service)
6. [Controller](#6-controller)
7. [Module](#7-module)
8. [Registration in app.module.ts](#8-registration-in-appmodulets)
9. [Query DTOs & Pagination](#9-query-dtos--pagination)
10. [Request/Response Data Formats](#10-requestresponse-data-formats)
11. [Full Example: Tags Module](#11-full-example-tags-module)
12. [Checklist](#12-checklist)

---

## 1. File Structure

Every module follows this exact layout:

```
src/modules/<module-name>/
├── <module-name>.module.ts
├── <module-name>.controller.ts
├── <module-name>.service.ts
└── dto/
    ├── create-<module-name>.dto.ts
    ├── update-<module-name>.dto.ts
    ├── <module-name>-response.dto.ts
    └── <module-name>-query.dto.ts       # optional — for filtered pagination
```

Naming conventions:
- Module files: **kebab-case** (`tags.module.ts`)
- DTO classes: **PascalCase** (`CreateTagDto`)
- Folder names: **plural** (`tags`, not `tag`)

---

## 2. Prisma Model

Add the model to `prisma/schema.prisma`. Follow these conventions:

```prisma
model YourModel {
  id          String   @id @default(uuid(7))
  name        String
  isDeleted   Boolean  @default(false) @map("is_deleted")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime? @updatedAt @map("updated_at")

  // relations go here

  @@map("your_models")                 // plural snake_case table name
}
```

**Rules:**
- Primary key: `String @id @default(uuid(7))`
- Table name: plural snake_case via `@@map("your_models")`
- Soft delete: `isDeleted Boolean @default(false) @map("is_deleted")`
- Timestamps: `createdAt` with `@default(now()) @map("created_at")`
- Column mapping: use `@map("snake_case")` for all non-id fields
- Add `updatedAt` with `@updatedAt @map("updated_at")` if the record can be modified

After adding the model, regenerate the Prisma client:
```bash
npx prisma generate
```

Then create a migration:
```bash
npm run migration:generate --name=add_your_model
```

---

## 3. Request DTOs

Create DTOs in `dto/create-<module-name>.dto.ts` and `dto/update-<module-name>.dto.ts`.

### Create DTO

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateYourModelDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Description text', nullable: true })
  @IsString()
  @IsOptional()
  description?: string;
}
```

**Rules:**
- Every field MUST have `@ApiProperty` or `@ApiPropertyOptional`
- Required fields: `@IsString() @IsNotEmpty()` (or `@IsNumber()`, `@IsBoolean()`, etc.)
- Optional fields: add `@IsOptional()` before the type validator
- UUIDs: `@IsUUID()` validator
- Use `!` assertion for required fields (`name!: string`)

### Update DTO

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateYourModelDto } from './create-your-model.dto';

export class UpdateYourModelDto extends PartialType(CreateYourModelDto) {}
```

`PartialType` makes ALL fields optional — no need to duplicate fields.

---

## 4. Response DTO

Add a response DTO to `dto/<module-name>-response.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class YourModelResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;

  @ApiPropertyOptional({ example: 'Some description', nullable: true })
  description?: string | null;

  @ApiProperty({ example: '2026-06-23T00:00:00.000Z' })
  createdAt: Date;
}
```

**Rules:**
- One response DTO class per model
- Include only fields the client needs (never `password`, `refreshToken`, `isDeleted`)
- All fields MUST have `@ApiProperty` for Swagger
- Place in the module's `dto/<module-name>-response.dto.ts` file
- If the response includes nested relations, add nested DTO properties with `@ApiPropertyOptional({ type: () => RelatedDto, nullable: true })`
- Re-export from `src/common/dto/response.dto.ts` so controllers can import from the barrel:

```typescript
// src/common/dto/response.dto.ts
export { YourModelResponseDto } from 'src/modules/your-model/dto/your-model-response.dto';
```

---

## 5. Service

Create `<module-name>.service.ts`:

```typescript
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  SingleResponse,
  PaginatedResponse,
} from 'src/common/interfaces/api-response.interface';
import { CreateYourModelDto, UpdateYourModelDto } from './dto/your-model.dto';
import { YourModelResponseDto } from './dto/your-model-response.dto';

@Injectable()
export class YourModelService {
  constructor(private prisma: PrismaService) {}

  // 1. Base select — defines the exact shape returned to the client
  private readonly baseSelect = {
    id: true,
    name: true,
    description: true,
    createdAt: true,
  } as const;

  // 2. Create — check duplicates, then create, return with baseSelect
  async create(
    dto: CreateYourModelDto,
  ): Promise<SingleResponse<YourModelResponseDto>> {
    const existing = await this.prisma.yourModel.findFirst({
      where: { name: dto.name, isDeleted: false },
    });

    if (existing) {
      throw new ConflictException(
        `YourModel "${dto.name}" already exists.`,
      );
    }

    const created = await this.prisma.yourModel.create({
      data: {
        name: dto.name,
      },
      select: this.baseSelect,
    });

    return { data: created as YourModelResponseDto };
  }

  // 3. Find All — paginated, searchable
  async findAll(
    query: YourModelQueryDto,
  ): Promise<PaginatedResponse<YourModelResponseDto>> {
    const { page, limit, search, isDeleted } = query;
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: isDeleted ?? false,
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.yourModel.findMany({
        where,
        orderBy: { name: 'asc' },
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

  // 4. Find One
  async findOne(
    id: string,
  ): Promise<SingleResponse<YourModelResponseDto>> {
    const data = await this.prisma.yourModel.findFirst({
      where: { id, isDeleted: false },
      select: this.baseSelect,
    });

    if (!data) {
      throw new NotFoundException(`YourModel with ID ${id} not found`);
    }

    return { data: data as YourModelResponseDto };
  }

  // 5. Update — check duplicate name if changed
  async update(
    id: string,
    dto: UpdateYourModelDto,
  ): Promise<SingleResponse<YourModelResponseDto>> {
    const item = await this.prisma.yourModel.findFirst({
      where: { id, isDeleted: false },
    });

    if (!item) {
      throw new NotFoundException(`YourModel with ID ${id} not found`);
    }

    if (dto.name && dto.name !== item.name) {
      const duplicate = await this.prisma.yourModel.findFirst({
        where: { name: dto.name, isDeleted: false },
      });

      if (duplicate) {
        throw new ConflictException(
          `YourModel "${dto.name}" already exists.`,
        );
      }
    }

    const data = await this.prisma.yourModel.update({
      where: { id },
      data: { name: dto.name },
      select: this.baseSelect,
    });

    return { data: data as YourModelResponseDto };
  }

  // 6. Delete — soft delete
  async remove(
    id: string,
  ): Promise<SingleResponse<YourModelResponseDto>> {
    const item = await this.prisma.yourModel.findFirst({
      where: { id, isDeleted: false },
    });

    if (!item) {
      throw new NotFoundException(`YourModel with ID ${id} not found`);
    }

    const data = await this.prisma.yourModel.update({
      where: { id },
      data: { isDeleted: true },
      select: this.baseSelect,
    });

    return { data: data as YourModelResponseDto };
  }
}
```

**Service rules:**
- Inject `PrismaService` (global — no import needed)
- Define a single `private readonly baseSelect` with all fields the client needs, including nested relations
- Every read query MUST use `select: this.baseSelect` to control the response shape
- Cast Prisma results as the response DTO: `data as YourModelResponseDto`
- Every query that reads/writes MUST filter by `isDeleted: false`
- Use `findFirst` for lookups
- Return `SingleResponse<T>` for single items, `PaginatedResponse<T>` for lists
- **No `mapModel()` helper needed** — Prisma returns the exact shape via `baseSelect`
- **Exclude sensitive fields**: The `baseSelect` only includes fields you explicitly list — never include `password`, `refreshToken`, etc.
- Soft delete: `update({ where: { id }, data: { isDeleted: true }, select: this.baseSelect })` — never `delete()`
- Check duplicates before create/update — use `ConflictException` (409)
- Throw `NotFoundException` (404) when item not found

---

## 6. Controller

Create `<module-name>.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { YourModelService } from './your-model.service';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CreateYourModelDto, UpdateYourModelDto } from './dto/your-model.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import {
  ApiSwaggerSingleResponse,
  ApiSwaggerPaginatedResponse,
} from 'src/common/decorators/api-response.decorator';
import type {
  SingleResponse,
  PaginatedResponse,
} from 'src/common/interfaces/api-response.interface';
import { YourModelResponseDto } from 'src/common/dto/response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Your Model')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('')
export class YourModelController {
  constructor(private readonly service: YourModelService) {}

  @ApiOperation({ summary: 'Create a new your-model' })
  @ApiSwaggerSingleResponse(YourModelResponseDto)
  @Post()
  @ResponseMessage('YourModel created successfully')
  async create(
    @Body() dto: CreateYourModelDto,
  ): Promise<SingleResponse<YourModelResponseDto>> {
    return await this.service.create(dto);
  }

  @ApiOperation({ summary: 'Get all your-models' })
  @ApiSwaggerPaginatedResponse(YourModelResponseDto)
  @Get()
  @ResponseMessage('YourModels fetched successfully')
  async findAll(
    @Query() queryDto: YourModelQueryDto,
  ): Promise<PaginatedResponse<YourModelResponseDto>> {
    return await this.service.findAll(queryDto);
  }

  @ApiOperation({ summary: 'Get a single your-model by ID' })
  @ApiSwaggerSingleResponse(YourModelResponseDto)
  @Get(':id')
  @ResponseMessage('YourModel fetched successfully')
  async findOne(
    @Param('id') id: string,
  ): Promise<SingleResponse<YourModelResponseDto>> {
    return await this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Update a your-model' })
  @ApiSwaggerSingleResponse(YourModelResponseDto)
  @Patch(':id')
  @ResponseMessage('YourModel updated successfully')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateYourModelDto,
  ): Promise<SingleResponse<YourModelResponseDto>> {
    return await this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a your-model' })
  @ApiSwaggerSingleResponse(YourModelResponseDto)
  @Delete(':id')
  @ResponseMessage('YourModel deleted successfully')
  async remove(
    @Param('id') id: string,
  ): Promise<SingleResponse<YourModelResponseDto>> {
    return await this.service.remove(id);
  }
}
```

**Controller rules:**
- Class decorators: `@ApiTags`, `@ApiBearerAuth`, `@UseGuards(JwtAuthGuard)`, `@Controller('')`
- Every method: `@ResponseMessage('...')` + `@ApiOperation({ summary: '...' })`
- Single responses: `@ApiSwaggerSingleResponse(YourModelResponseDto)`
- Paginated responses: `@ApiSwaggerPaginatedResponse(YourModelResponseDto)`
- Always return the service result directly — the `ApiResponseInterceptor` wraps it automatically
- Use `@Query()` for GET list endpoints, `@Body()` for POST/PATCH, `@Param('id')` for single-item routes

---

## 7. Module

Create `<module-name>.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { YourModelController } from './your-model.controller';
import { YourModelService } from './your-model.service';

@Module({
  controllers: [YourModelController],
  providers: [YourModelService],
})
export class YourModelModule {}
```

**Rules:**
- No imports needed unless using services from other modules
- No exports needed unless other modules depend on this module's services
- `PrismaModule` is global — never import it here

---

## 8. Registration in app.module.ts

Two changes in `src/app.module.ts`:

### 1. Add to imports array

```typescript
import { YourModelModule } from './modules/your-model/your-model.module';

@Module({
  imports: [
    // ... existing imports ...
    YourModelModule,
  ],
})
```

### 2. Add to RouterModule

```typescript
RouterModule.register([
  {
    path: 'v1',
    children: [
      // ... existing routes ...
      {
        path: 'admin',
        children: [
          // ... existing admin routes ...
          { path: 'your-models', module: YourModelModule },
        ],
      },
    ],
  },
]),
```

**Route naming:**
- Use **plural** kebab-case: `your-models`
- Admin/scoped routes go under `admin/`
- Public routes (like `auth`) go directly under `v1/`

---

## 9. Query DTOs & Pagination

### Base PaginationDto

Located at `src/common/dto/pagination.dto.ts`:

```typescript
export class PaginationDto {
  page: number = 1;        // default 1
  limit: number = 20;      // default 20, max 100
  search?: string;          // free-text search
}
```

Query params: `?page=1&limit=20&search=electronics`

### Extended Query DTO (for filtering)

When you need additional filters (like `isDeleted` soft-delete filtering), extend `PaginationDto`:

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class YourModelQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by soft-deleted status. Default: false (active only).',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isDeleted?: boolean;
}
```

Then use in service:

```typescript
async findAll(query: YourModelQueryDto) {
  const { page, limit, search, isDeleted } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, any> = {
    isDeleted: isDeleted ?? false,   // active only by default
  };
  if (search) {
    where.name = { contains: search, mode: 'insensitive' as const };
  }
  // ... use where in findMany + count
}
```

**Soft-delete query behavior:**
- `?isDeleted=true` → returns only soft-deleted records
- `?isDeleted=false` → returns only active records
- Omitted → defaults to `false` (active only)

**Existing query DTOs:**

| Module | Query DTO          | Location                                       |
| ------ | ------------------ | ---------------------------------------------- |
| Roles  | `RoleQueryDto`     | `src/modules/roles/dto/roles.dto.ts`           |
| Users  | `UserFilterDto`    | `src/modules/users/dto/user-filter.dto.ts`     |
| Todos  | `TodoQueryDto`     | `src/modules/todo/dto/todo-query.dto.ts`       |

---

## 10. Request/Response Data Formats

### Create Request

```
POST /api/v1/admin/tags
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Important"
}
```

### Create Response

```json
{
  "success": true,
  "message": "Tag created successfully",
  "data": {
    "id": "0197a2b4-c3d4-7890-abcd-ef1234567890",
    "name": "Important",
    "createdAt": "2026-06-25T12:00:00.000Z"
  }
}
```

### List Request (Paginated)

```
GET /api/v1/admin/tags?page=1&limit=20&search=imp
Authorization: Bearer <token>
```

### List Response (Paginated)

```json
{
  "success": true,
  "message": "Tags fetched successfully",
  "data": [
    {
      "id": "0197a2b4-c3d4-7890-abcd-ef1234567890",
      "name": "Important",
      "createdAt": "2026-06-25T12:00:00.000Z"
    }
  ],
  "meta": {
    "totalItems": 1,
    "itemCount": 1,
    "itemsPerPage": 20,
    "totalPages": 1,
    "currentPage": 1
  }
}
```

### Single Fetch Request

```
GET /api/v1/admin/tags/0197a2b4-c3d4-7890-abcd-ef1234567890
Authorization: Bearer <token>
```

### Single Fetch Response

```json
{
  "success": true,
  "message": "Tag fetched successfully",
  "data": {
    "id": "0197a2b4-c3d4-7890-abcd-ef1234567890",
    "name": "Important",
    "createdAt": "2026-06-25T12:00:00.000Z"
  }
}
```

### Update Request

```
PATCH /api/v1/admin/tags/0197a2b4-c3d4-7890-abcd-ef1234567890
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Critical"
}
```

### Delete Response

```json
{
  "success": true,
  "message": "Tag deleted successfully",
  "data": {
    "id": "0197a2b4-c3d4-7890-abcd-ef1234567890",
    "name": "Critical",
    "createdAt": "2026-06-25T12:00:00.000Z"
  }
}
```

### Error Response

```json
{
  "statusCode": 409,
  "message": "YourModel \"Important\" already exists.",
  "error": "Conflict"
}
```

---

## 11. Full Example: Tags Module

Here is a complete tags module for reference — it follows every pattern described above.

### `dto/tags.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class CreateTagDto {
  @ApiProperty({ example: 'Important' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'High priority items', nullable: true })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTagDto extends PartialType(CreateTagDto) {}

export class TagQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by soft-deleted status. Default: false (active only).',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isDeleted?: boolean;
}
```

### `tags.service.ts`

```typescript
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SingleResponse, PaginatedResponse } from 'src/common/interfaces/api-response.interface';
import { CreateTagDto, UpdateTagDto, TagQueryDto } from './dto/tags.dto';
import { TagResponseDto } from './dto/tag-response.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  private readonly baseSelect = {
    id: true,
    name: true,
    description: true,
    createdAt: true,
  } as const;

  async createTag(dto: CreateTagDto): Promise<SingleResponse<TagResponseDto>> {
    const existing = await this.prisma.tag.findFirst({
      where: { name: dto.name, isDeleted: false },
    });
    if (existing) {
      throw new ConflictException(`Tag "${dto.name}" already exists.`);
    }

    const created = await this.prisma.tag.create({
      data: { name: dto.name, description: dto.description },
      select: this.baseSelect,
    });

    return { data: created as TagResponseDto };
  }

  async findAllTags(query: TagQueryDto): Promise<PaginatedResponse<TagResponseDto>> {
    const { page, limit, search, isDeleted } = query;
    const skip = (page - 1) * limit;
    const where = {
      isDeleted: isDeleted ?? false,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.tag.findMany({ where, orderBy: { name: 'asc' }, take: limit, skip, select: this.baseSelect }),
      this.prisma.tag.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: items as TagResponseDto[],
      meta: { totalItems, itemCount: items.length, itemsPerPage: limit, totalPages, currentPage: page },
    };
  }

  async findOneTag(id: string): Promise<SingleResponse<TagResponseDto>> {
    const data = await this.prisma.tag.findFirst({
      where: { id, isDeleted: false },
      select: this.baseSelect,
    });
    if (!data) throw new NotFoundException(`Tag with ID ${id} not found`);
    return { data: data as TagResponseDto };
  }

  async updateTag(id: string, dto: UpdateTagDto): Promise<SingleResponse<TagResponseDto>> {
    const tag = await this.prisma.tag.findFirst({
      where: { id, isDeleted: false },
    });
    if (!tag) throw new NotFoundException(`Tag with ID ${id} not found`);

    if (dto.name && dto.name !== tag.name) {
      const duplicate = await this.prisma.tag.findFirst({
        where: { name: dto.name, isDeleted: false },
      });
      if (duplicate) throw new ConflictException(`Tag "${dto.name}" already exists.`);
    }

    const data = await this.prisma.tag.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
      select: this.baseSelect,
    });
    return { data: data as TagResponseDto };
  }

  async deleteTag(id: string): Promise<SingleResponse<TagResponseDto>> {
    const tag = await this.prisma.tag.findFirst({
      where: { id, isDeleted: false },
    });
    if (!tag) throw new NotFoundException(`Tag with ID ${id} not found`);

    const data = await this.prisma.tag.update({
      where: { id },
      data: { isDeleted: true },
      select: this.baseSelect,
    });
    return { data: data as TagResponseDto };
  }
}
```

### `tags.controller.ts`

```typescript
import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, Query } from '@nestjs/common';
import { TagsService } from './tags.service';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CreateTagDto, UpdateTagDto, TagQueryDto } from './dto/tags.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { ApiSwaggerSingleResponse, ApiSwaggerPaginatedResponse } from 'src/common/decorators/api-response.decorator';
import type { SingleResponse, PaginatedResponse } from 'src/common/interfaces/api-response.interface';
import { TagResponseDto } from 'src/common/dto/response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @ApiOperation({ summary: 'Create a new tag' })
  @ApiSwaggerSingleResponse(TagResponseDto)
  @Post()
  @ResponseMessage('Tag created successfully')
  async createTag(@Body() dto: CreateTagDto): Promise<SingleResponse<TagResponseDto>> {
    return await this.tagsService.createTag(dto);
  }

  @ApiOperation({ summary: 'Get all tags' })
  @ApiSwaggerPaginatedResponse(TagResponseDto)
  @Get()
  @ResponseMessage('Tags fetched successfully')
  async findAllTags(@Query() queryDto: TagQueryDto): Promise<PaginatedResponse<TagResponseDto>> {
    return await this.tagsService.findAllTags(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single tag by ID' })
  @ApiSwaggerSingleResponse(TagResponseDto)
  @ResponseMessage('Tag fetched successfully')
  async findOneTag(@Param('id') id: string): Promise<SingleResponse<TagResponseDto>> {
    return await this.tagsService.findOneTag(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiSwaggerSingleResponse(TagResponseDto)
  @ResponseMessage('Tag updated successfully')
  async updateTag(@Param('id') id: string, @Body() dto: UpdateTagDto): Promise<SingleResponse<TagResponseDto>> {
    return await this.tagsService.updateTag(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiSwaggerSingleResponse(TagResponseDto)
  @ResponseMessage('Tag deleted successfully')
  async deleteTag(@Param('id') id: string): Promise<SingleResponse<TagResponseDto>> {
    return await this.tagsService.deleteTag(id);
  }
}
```

### `tags.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}
```

---

## 12. Checklist

Use this checklist before submitting a new module:

- [ ] Prisma model added with `isDeleted`, `createdAt`
- [ ] `npx prisma generate` run
- [ ] Migration created and applied
- [ ] Create DTO with `@ApiProperty` + `class-validator` decorators
- [ ] Update DTO using `PartialType`
- [ ] Response DTO added to module's `dto/<module>-response.dto.ts`
- [ ] Service injects `PrismaService`, defines `private readonly baseSelect`
- [ ] All read queries use `select: this.baseSelect`
- [ ] Service casts Prisma results as response DTO: `data as YourModelResponseDto`
- [ ] All queries filter by `isDeleted: false`
- [ ] Service uses soft delete (`isDeleted: true`) not hard delete
- [ ] Query DTO created with `isDeleted` filter extending `PaginationDto`
- [ ] Service `findAll` accepts query DTO and uses `isDeleted` from it
- [ ] Controller `findAll` accepts query DTO
- [ ] Service checks duplicates before create/update → `ConflictException`
- [ ] Controller has `@ApiTags`, `@ApiBearerAuth`, `@UseGuards(JwtAuthGuard)`
- [ ] Controller has `@ResponseMessage()` on every endpoint
- [ ] Controller has `@ApiSwaggerSingleResponse` or `@ApiSwaggerPaginatedResponse`
- [ ] Module file created with controller + service
- [ ] Module imported in `app.module.ts`
- [ ] Route added to `RouterModule` in `app.module.ts`
- [ ] Response DTO exported from `src/common/dto/response.dto.ts`
- [ ] Build passes: `npm run build`
- [ ] Lint passes: `npm run lint`
