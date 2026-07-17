import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleResponseDto } from 'src/modules/roles/dto/roles-response.dto';

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
