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
import {
  PermissionResponseDto,
  RoleResponseDto,
} from 'src/common/dto/response.dto';

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type RoleWithPermissions = Role & {
  rolePermissions?: Array<{
    permission: Permission;
  }>;
};

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  private mapPermission(permission: Permission): PermissionResponseDto {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
    };
  }

  private mapRole(role: RoleWithPermissions): RoleResponseDto {
    const permissions =
      role.rolePermissions?.map((rolePermission) =>
        this.mapPermission(rolePermission.permission),
      ) ?? [];

    return {
      id: role.id,
      name: role.name,
      permissions,
    };
  }

  async createRole(
    dto: CreateRoleDto,
  ): Promise<SingleResponse<RoleResponseDto>> {
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
    return { data: this.mapRole(role) };
  }

  async updateRole(
    id: string,
    dto: UpdateRoleDto,
  ): Promise<SingleResponse<RoleResponseDto>> {
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
    return { data: this.mapRole(updated) };
  }

  async findAllRoles(): Promise<ListResponse<RoleResponseDto>> {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
    return { data: roles.map((role) => this.mapRole(role)) };
  }

  async findOneRole(id: string): Promise<SingleResponse<RoleResponseDto>> {
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
    return { data: this.mapRole(role) };
  }

  async deleteRole(id: string): Promise<SingleResponse<Role>> {
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

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    await this.prisma.role.delete({ where: { id } });

    return { data: this.mapRole(role) };
  }

  async findAllPermissions(): Promise<ListResponse<Permission>> {
    const permissions = await this.prisma.permission.findMany();
    return { data: permissions };
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
      const result = await this.prisma.rolePermission.deleteMany({
        where: {
          roleId: roleId,
          permissionId: permissionId,
        },
      });
      return { data: { removed: result.count > 0 } };
    } catch {
      return { data: { removed: false } };
    }
  }
}
