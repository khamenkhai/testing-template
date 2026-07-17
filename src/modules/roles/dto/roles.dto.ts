import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class CreateRoleDto {
  @ApiProperty({ example: 'Editor' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Array of existing Permission UUIDs',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  permissions?: string[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

export class RoleQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by soft-deleted status. Default: false (active only).',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isDeleted?: boolean;
}
