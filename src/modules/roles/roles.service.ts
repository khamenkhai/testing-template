import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  SingleResponse,
  ListResponse,
} from 'src/common/interfaces/api-response.interface';
import { CreateRoleDto, UpdateRoleDto } from './dto/roles.dto';
import { Role, Permission } from 'src/database/generated/prisma/client';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async createRole(dto: CreateRoleDto) {
    const existingRole = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existingRole) {
      if (dto.permissions?.length) {
        const duplicateLink = await this.prisma.rolePermission.findFirst({
          where: {
            roleId: existingRole.id,
            permissionId: { in: dto.permissions },
          },
          include: { permission: true },
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

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        rolePermissions: {
          create: dto.permissions?.map((permissionId) => ({
            permissionId,
          })),
        },
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
    return { data: role };
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<SingleResponse<Role>> {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);

    const updated = await this.prisma.role.update({
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
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
    return { data: updated };
  }

  async findAllRoles(): Promise<ListResponse<Role>> {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
    return { data: roles };
  }

  async findOneRole(id: string): Promise<SingleResponse<Role>> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return { data: role };
  }

  async deleteRole(id: string): Promise<SingleResponse<{ success: boolean }>> {
    try {
      await this.prisma.role.delete({ where: { id } });
      return { data: { success: true } };
    } catch (error) {
      return { data: { success: false } };
    }
  }

  async findAllPermissions(): Promise<ListResponse<Permission>> {
    const permissions = await this.prisma.permission.findMany();
    return { data: permissions };
  }

  async deletePermission(id: string): Promise<boolean> {
    try {
      await this.prisma.permission.delete({ where: { id } });
      return true;
    } catch (error) {
      return false;
    }
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<SingleResponse<{ removed: boolean }>> {
    try {
      const result = await this.prisma.rolePermission.deleteMany({
        where: {
          roleId: roleId,
          permissionId: permissionId,
        },
      });
      return { data: { removed: result.count > 0 } };
    } catch (error) {
      return { data: { removed: false } };
    }
  }
}
