import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { TodoService } from './todo.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/common/config/multer.config';
import { GetUser } from 'src/modules/auth/decorators/get-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/types/auth-request.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PermissionsGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/decorators/permission.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import {
  ApiSwaggerSingleResponse,
  ApiSwaggerPaginatedResponse,
} from 'src/common/decorators/api-response.decorator';
import type {
  SingleResponse,
  PaginatedResponse,
} from 'src/common/interfaces/api-response.interface';
import { Todo } from 'src/database/generated/prisma/client';

@ApiTags('Todo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('')
export class TodoController {
  constructor(private readonly todoService: TodoService) { }

  @ApiOperation({ summary: 'Create a new todo' })
  @ApiSwaggerSingleResponse(Object)
  @Post()
  @RequirePermissions('todo.create')
  @ResponseMessage('Created Todo Successfully!')
  async create(
    @Body() createTodoDto: CreateTodoDto,
    @Request() req,
  ): Promise<SingleResponse<Todo>> {
    return this.todoService.create(createTodoDto, req.user);
  }

  @ApiOperation({ summary: 'Get all todos for the current user' })
  @ApiSwaggerPaginatedResponse(Object)
  @Get()
  @RequirePermissions('todo.read')
  @ResponseMessage('Fetched All Todos Successfully')
  async findAll(
    @GetUser() user: AuthenticatedUser,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<Todo>> {
    const { page, limit } = paginationDto;
    return this.todoService.findAll(user.id, page, limit);
  }

  @ApiOperation({ summary: 'Get a specific todo by ID' })
  @ApiSwaggerSingleResponse(Object)
  @Get(':id')
  @RequirePermissions('todo.read')
  @ResponseMessage('Fetched Todo Details Successfully')
  async findOne(
    @Param('id') id: string,
    @Request() req,
  ): Promise<SingleResponse<Todo>> {
    return this.todoService.findOne(id, req.user.id);
  }

  @ApiOperation({ summary: 'Update a specific todo by ID' })
  @ApiSwaggerSingleResponse(Object)
  @Patch(':id')
  @RequirePermissions('todo.update')
  @ResponseMessage('Updated Todo Successfully')
  async update(
    @Param('id') id: string,
    @Body() updateTodoDto: UpdateTodoDto,
    @Request() req,
  ): Promise<SingleResponse<Todo>> {
    return this.todoService.update(id, updateTodoDto, req.user.id);
  }

  @ApiOperation({ summary: 'Delete a specific todo by ID' })
  @ApiSwaggerSingleResponse(Object)
  @Delete(':id')
  @RequirePermissions('todo.delete')
  @ResponseMessage('Deleted Todo Successfully')
  async remove(
    @Param('id') id: string,
    @Request() req,
  ): Promise<SingleResponse<{ id: string; success: boolean }>> {
    return this.todoService.remove(id, req.user.id);
  }

  @ApiOperation({
    summary: 'Create todo with an image (form-data)',
  })
  @ApiSwaggerSingleResponse(Object)
  @ApiConsumes('multipart/form-data')
  @RequirePermissions('todo.create')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          example: 'Summer Vacation 2026',
        },
        description: {
          type: 'string',
          example: 'A collection of photos from the trip to Italy.',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Upload the image file here',
        },
      },
      required: ['title'],
    },
  })
  @Post('with-image')
  @UseInterceptors(FileInterceptor('image', multerOptions))
  @ResponseMessage('Created Todo with Image Successfully')
  async createWithImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() createTodoDto: CreateTodoDto,
    @Request() req,
  ): Promise<SingleResponse<Todo>> {
    return this.todoService.createWithImage(createTodoDto, req.user, file);
  }
}
