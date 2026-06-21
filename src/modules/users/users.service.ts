import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SingleResponse } from 'src/common/interfaces/api-response.interface';
import { User } from 'src/database/generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<SingleResponse<User>> {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: dto.password,
        role: dto.roleId ? { connect: { id: dto.roleId } } : undefined,
      },
      include: {
        role: true,
      },
    });
    return { data: user };
  }

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });
  }

  async update(id: string, updateUserDto: Partial<User>): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: updateUserDto as any, // Cast to any to handle partial updates cleanly for now
    });
  }

  async updateRefreshToken(refreshToken: string, id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }

  async assignRole(
    userId: string,
    roleId: string,
  ): Promise<SingleResponse<User>> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: { connect: { id: roleId } },
      },
      include: {
        role: true,
      },
    });
    return { data: updated };
  }
}
