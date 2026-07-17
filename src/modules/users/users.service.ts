import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  SingleResponse,
  PaginatedResponse,
} from 'src/common/interfaces/api-response.interface';
import { UserFilterDto } from './dto/user-filter.dto';

@Injectable()
export class UsersService {
  private readonly safeUserSelect = {
    id: true,
    username: true,
    email: true,
    roleId: true,
    isDeleted: true,
    createdAt: true,
    updatedAt: true,
  };

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<SingleResponse<any>> {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: dto.password,
        role: dto.roleId ? { connect: { id: dto.roleId } } : undefined,
      },
      select: this.safeUserSelect,
    });
    return { data: user };
  }

  async findAll(query: UserFilterDto): Promise<PaginatedResponse<any>> {
    const { page, limit, search, isDeleted } = query;
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: isDeleted ?? false };

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: this.safeUserSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.user.findFirst({
      where: { id, isDeleted: false },
      select: this.safeUserSelect,
    });
  }

  async findOneByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, isDeleted: false },
      select: this.safeUserSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<SingleResponse<any>> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        username: dto.username,
        roleId: dto.roleId,
      },
      select: this.safeUserSelect,
    });
    return { data: updated };
  }

  async remove(
    id: string,
  ): Promise<SingleResponse<{ id: string; success: boolean }>> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });

    return { data: { id, success: true } };
  }

  async updateRefreshToken(refreshToken: string, id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }
}
