import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { sanitizeFileName } from 'src/common/config/multer.config';
import {
  PaginatedResponse,
  SingleResponse,
} from 'src/common/interfaces/api-response.interface';
import { Todo, User } from 'src/database/generated/prisma/client';

@Injectable()
export class TodoService {
  constructor(
    private prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  private async getTodoEntity(id: string, userId: string): Promise<Todo> {
    const todo = await this.prisma.todo.findFirst({
      where: { id, userId },
    });

    if (!todo) {
      throw new NotFoundException(`Todo with ID ${id} not found`);
    }

    if (todo.image) {
      const presignedUrl = await this.uploadService.getPresignedUrl(todo.image);
      return { ...todo, image: presignedUrl };
    }

    return todo;
  }

  async create(
    createTodoDto: CreateTodoDto,
    user: User,
  ): Promise<SingleResponse<Todo>> {
    const todo = await this.prisma.todo.create({
      data: {
        ...createTodoDto,
        user: { connect: { id: user.id } },
      },
    });

    return { data: todo };
  }

  async createWithImage(
    createTodoDto: CreateTodoDto,
    user: User,
    file?: Express.Multer.File,
  ): Promise<SingleResponse<Todo>> {
    let imageKey: string = '';

    if (file) {
      imageKey = await this.uploadImage(file);
    }

    const savedTodo = await this.prisma.todo.create({
      data: {
        ...createTodoDto,
        image: imageKey,
        user: { connect: { id: user.id } },
      },
    });

    if (savedTodo.image) {
      const presignedUrl = await this.uploadService.getPresignedUrl(
        savedTodo.image,
      );
      return { data: { ...savedTodo, image: presignedUrl } };
    }

    return { data: savedTodo };
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Todo>> {
    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      this.prisma.todo.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: skip,
      }),
      this.prisma.todo.count({
        where: { userId },
      }),
    ]);

    const itemsWithUrls = await Promise.all(
      items.map(async (todo) => {
        if (todo.image) {
          const presignedUrl = await this.uploadService.getPresignedUrl(
            todo.image,
          );
          return { ...todo, image: presignedUrl };
        }
        return todo;
      }),
    );

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: itemsWithUrls,
      meta: {
        totalItems,
        itemCount: itemsWithUrls.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async findOne(id: string, userId: string): Promise<SingleResponse<Todo>> {
    const todo = await this.getTodoEntity(id, userId);
    return { data: todo };
  }

  async update(
    id: string,
    updateTodoDto: UpdateTodoDto,
    userId: string,
  ): Promise<SingleResponse<Todo>> {
    await this.getTodoEntity(id, userId);

    const updatedTodo = await this.prisma.todo.update({
      where: { id },
      data: updateTodoDto,
    });

    if (updatedTodo.image) {
      const presignedUrl = await this.uploadService.getPresignedUrl(
        updatedTodo.image,
      );
      return { data: { ...updatedTodo, image: presignedUrl } };
    }

    return { data: updatedTodo };
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<SingleResponse<{ id: string; success: boolean }>> {
    await this.getTodoEntity(id, userId);

    await this.prisma.todo.delete({
      where: { id },
    });

    return { data: { id, success: true } };
  }

  private async uploadImage(file: Express.Multer.File): Promise<string> {
    const uploadBody = file.buffer || fs.createReadStream(file.path);

    const uploadResult = await this.uploadService.uploadFile(
      sanitizeFileName(file.originalname),
      uploadBody,
      file.mimetype,
    );

    return uploadResult.key;
  }
}
