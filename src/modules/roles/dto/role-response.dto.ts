import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'todo.create' })
  name: string;

  @ApiPropertyOptional({ example: 'Create todo items', nullable: true })
  description?: string | null;
}

export class RoleResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Admin' })
  name: string;

  @ApiProperty({ type: () => [PermissionResponseDto] })
  permissions: PermissionResponseDto[];
}
