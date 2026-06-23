import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/modules/auth/types/auth-request.interface';

export class ApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Request successful' })
  message: string;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 100 })
  totalItems: number;

  @ApiProperty({ example: 10 })
  itemCount: number;

  @ApiProperty({ example: 10 })
  itemsPerPage: number;

  @ApiProperty({ example: 10 })
  totalPages: number;

  @ApiProperty({ example: 1 })
  currentPage: number;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Logged out successfully' })
  message: string;
}

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}

export class RemovedResponseDto {
  @ApiProperty({ example: true })
  removed: boolean;
}

export class IdSuccessResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: true })
  success: boolean;
}

export class PermissionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'todo.create' })
  name: string;

  @ApiPropertyOptional({ example: 'Can create todos', nullable: true })
  description?: string | null;
}

export class RolePermissionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  roleId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  permissionId: string;

  @ApiProperty({ type: () => PermissionResponseDto })
  permission: PermissionResponseDto;
}

export class RoleResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Admin' })
  name: string;

  @ApiProperty({ type: () => [PermissionResponseDto] })
  permissions?: PermissionResponseDto[];
}

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'jane_doe' })
  username: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440010',
    nullable: true,
  })
  roleId?: string | null;

  @ApiPropertyOptional({ type: () => RoleResponseDto, nullable: true })
  role?: RoleResponseDto | null;

  @ApiProperty({ example: false })
  isDeleted: boolean;

  @ApiPropertyOptional({ example: 'hashed-password', nullable: true })
  password?: string | null;

  @ApiPropertyOptional({ example: 'refresh-token-hash', nullable: true })
  refreshToken?: string | null;

  @ApiProperty({ example: '2026-06-23T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-23T00:00:00.000Z' })
  updatedAt: Date;
}

export class TodoResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Buy groceries' })
  title: string;

  @ApiPropertyOptional({
    example: 'Buy milk, eggs, and bread',
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({ example: false })
  isCompleted: boolean;

  @ApiProperty({ example: false })
  isDeleted: boolean;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/uploads/todo-image.png',
    nullable: true,
  })
  image?: string | null;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440010',
    nullable: true,
  })
  userId?: string | null;

  @ApiProperty({ example: '2026-06-23T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-23T00:00:00.000Z' })
  updatedAt: Date;
}

export class AuthLoginResponseDto {
  @ApiProperty({ example: 'access-token-value' })
  access_token: string;

  @ApiProperty({ example: 'refresh-token-value' })
  refresh_token: string;

  @ApiProperty({ type: () => AuthenticatedUser })
  user: AuthenticatedUser;
}

export class AuthTokenPairResponseDto {
  @ApiProperty({ example: 'access-token-value' })
  access_token: string;

  @ApiProperty({ example: 'refresh-token-value' })
  refresh_token: string;
}
