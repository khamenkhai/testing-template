import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
