import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
