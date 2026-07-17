import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTodoDto {
  @ApiProperty({
    example: 'Buy groceries from supermarket',
    description: 'The title of the todo',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Buy milk, eggs, bread, and some fruits for the week',
    description: 'Detailed description of the todo',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isCompleted?: boolean;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Optional image file upload',
  })
  @IsOptional()
  image?: any;
}
