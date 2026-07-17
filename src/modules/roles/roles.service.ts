import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  SingleResponse,
  ListResponse,
  PaginatedResponse,
} from 'src/common/interfaces/api-response.interface';
import { CreateRoleDto, UpdateRoleDto, RoleQueryDto } from './dto/roles.dto';
import {
  RoleResponseDto,
  PermissionResponseDto,
} from './dto/role-response.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  private readonly permissionSelect = {
    id: true,
    name: true,
    description: true,
  } as const;

  private readonly baseSelect = {
    id: true,
    name: true,
    rolePermissions: {
      select: {
        permission: {
          select: this.permissionSelect,
        },
      },
    },
  } as const;

  async createRole(
    dto: CreateRoleDto,
  ): Promise<SingleResponse<RoleResponseDto>> {
    const existingRole = await this.prisma.role.findFirst({
      where: { name: dto.name, isDeleted: false },
    });

    if (existingRole) {
      if (dto.permissions?.length) {
        const duplicateLink = await this.prisma.rolePermission.findFirst({
          where: {
            roleId: existingRole.id,
            permissionId: { in: dto.permissions },
          },
        });

        if (duplicateLink) {
          throw new ConflictException(
            `Role "${dto.name}" already has permission ID: ${duplicateLink.permissionId}`,
          );
        }
      } else {
        throw new ConflictException(
          `Role with name "${dto.name}" already exists.`,
        );
      }
    }

    const created = await this.prisma.role.create({
      data: {
        name: dto.name,
        rolePermissions: {
          create: dto.permissions?.map((permissionId) => ({
            permissionId,
          })),
        },
      },
      select: this.baseSelect,
    });

    return { data: this.mapRole(created) };
  }

  async updateRole(
    id: string,
    dto: UpdateRoleDto,
  ): Promise<SingleResponse<RoleResponseDto>> {
    const role = await this.prisma.role.findFirst({
      where: { id, isDeleted: false },
    });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);

    const data = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        rolePermissions: dto.permissions
          ? {
              deleteMany: {},
              create: dto.permissions.map((permissionId) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      select: this.baseSelect,
    });

    return { data: this.mapRole(data) };
  }

  async findAllRoles(
    query: RoleQueryDto,
  ): Promise<PaginatedResponse<RoleResponseDto>> {
    const { page, limit, search, isDeleted } = query;
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: isDeleted ?? false,
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.role.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip,
        select: this.baseSelect,
      }),
      this.prisma.role.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items.map((role) => this.mapRole(role)),
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async findOneRole(id: string): Promise<SingleResponse<RoleResponseDto>> {
    const data = await this.prisma.role.findFirst({
      where: { id, isDeleted: false },
      select: this.baseSelect,
    });

    if (!data) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return { data: this.mapRole(data) };
  }

  async deleteRole(id: string): Promise<SingleResponse<RoleResponseDto>> {
    const role = await this.prisma.role.findFirst({
      where: { id, isDeleted: false },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const data = await this.prisma.role.update({
      where: { id },
      data: { isDeleted: true },
      select: this.baseSelect,
    });

    return { data: this.mapRole(data) };
  }

  async findAllPermissions(): Promise<ListResponse<PermissionResponseDto>> {
    const permissions = await this.prisma.permission.findMany({
      where: { isDeleted: false },
      select: this.permissionSelect,
    });
    return { data: permissions as PermissionResponseDto[] };
  }

  async deletePermission(id: string): Promise<boolean> {
    try {
      await this.prisma.permission.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<SingleResponse<{ removed: boolean }>> {
    try {
      const role = await this.prisma.role.findFirst({
        where: { id: roleId, isDeleted: false },
      });
      if (!role) {
        return { data: { removed: false } };
      }
      const result = await this.prisma.rolePermission.deleteMany({
        where: { roleId, permissionId },
      });
      return { data: { removed: result.count > 0 } };
    } catch {
      return { data: { removed: false } };
    }
  }

  private mapRole(role: any): RoleResponseDto {
    const permissions =
      role.rolePermissions?.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description ?? null,
      })) ?? [];

    return {
      id: role.id,
      name: role.name,
      permissions,
    };
  }
}
