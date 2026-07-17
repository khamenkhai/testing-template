import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import {
  ApiSwaggerSingleResponse,
  ApiSwaggerPaginatedResponse,
} from 'src/common/decorators/api-response.decorator';
import { UserFilterDto } from './dto/user-filter.dto';
import type {
  SingleResponse,
  PaginatedResponse,
} from 'src/common/interfaces/api-response.interface';
import { UserResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Create a new user' })
  @ApiSwaggerSingleResponse(UserResponseDto)
  @Post()
  @ResponseMessage('User created successfully')
  async create(@Body() dto: CreateUserDto): Promise<SingleResponse<any>> {
    return this.usersService.create(dto);
  }

  @ApiOperation({ summary: 'Get all users' })
  @ApiSwaggerPaginatedResponse(UserResponseDto)
  @Get()
  @ResponseMessage('Users fetched successfully')
  async findAll(@Query() dto: UserFilterDto): Promise<PaginatedResponse<any>> {
    return this.usersService.findAll(dto);
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiSwaggerSingleResponse(UserResponseDto)
  @Get(':id')
  @ResponseMessage('User fetched successfully')
  async findOne(@Param('id') id: string): Promise<SingleResponse<any>> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { data: user };
  }

  @ApiOperation({ summary: 'Update a user' })
  @ApiSwaggerSingleResponse(UserResponseDto)
  @Patch(':id')
  @ResponseMessage('User updated successfully')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<SingleResponse<any>> {
    return this.usersService.update(id, dto);
  }

  @ApiOperation({ summary: 'Soft delete a user' })
  @ApiSwaggerSingleResponse(UserResponseDto)
  @Delete(':id')
  @ResponseMessage('User deleted successfully')
  async remove(
    @Param('id') id: string,
  ): Promise<SingleResponse<{ id: string; success: boolean }>> {
    return this.usersService.remove(id);
  }
}
