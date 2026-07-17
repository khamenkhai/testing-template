import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import {
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateRoleDto, UpdateRoleDto, RoleQueryDto } from './dto/roles.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import {
  ApiSwaggerSingleResponse,
  ApiSwaggerListResponse,
  ApiSwaggerPaginatedResponse,
} from 'src/common/decorators/api-response.decorator';
import type {
  SingleResponse,
  ListResponse,
  PaginatedResponse,
} from 'src/common/interfaces/api-response.interface';
import {
  PermissionResponseDto,
  RemovedResponseDto,
  RoleResponseDto,
} from 'src/common/dto/response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: 'Create new role with optional nested permissions' })
  @ApiSwaggerSingleResponse(RoleResponseDto)
  @Post()
  @ResponseMessage('Role created successfully')
  async createRole(
    @Body() dto: CreateRoleDto,
  ): Promise<SingleResponse<RoleResponseDto>> {
    return await this.rolesService.createRole(dto);
  }

  @ApiOperation({ summary: 'Get all roles' })
  @ApiSwaggerPaginatedResponse(RoleResponseDto)
  @Get()
  @ResponseMessage('Roles fetched successfully')
  async findAllRoles(
    @Query() queryDto: RoleQueryDto,
  ): Promise<PaginatedResponse<RoleResponseDto>> {
    return await this.rolesService.findAllRoles(queryDto);
  }

  @ApiOperation({ summary: 'Get a single role by ID' })
  @ApiSwaggerSingleResponse(RoleResponseDto)
  @Get(':id')
  @ResponseMessage('Role fetched successfully')
  async findOneRole(
    @Param('id') id: string,
  ): Promise<SingleResponse<RoleResponseDto>> {
    return await this.rolesService.findOneRole(id);
  }

  @ApiOperation({ summary: 'Update role and its permissions' })
  @ApiSwaggerSingleResponse(RoleResponseDto)
  @Patch(':id')
  @ResponseMessage('Role updated successfully')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<SingleResponse<RoleResponseDto>> {
    return await this.rolesService.updateRole(id, dto);
  }

  @ApiOperation({ summary: 'Delete a role' })
  @ApiSwaggerSingleResponse(RoleResponseDto)
  @Delete(':id')
  @ResponseMessage('Role deleted successfully')
  async deleteRole(
    @Param('id') id: string,
  ): Promise<SingleResponse<RoleResponseDto>> {
    return await this.rolesService.deleteRole(id);
  }

  @ApiOperation({ summary: 'Get all permissions available in the system' })
  @ApiSwaggerListResponse(PermissionResponseDto)
  @Get('permissions/all')
  @ResponseMessage('Permissions fetched successfully')
  async findAllPermissions(): Promise<ListResponse<PermissionResponseDto>> {
    return await this.rolesService.findAllPermissions();
  }

  @ApiOperation({ summary: 'Remove a specific permission from a role' })
  @ApiSwaggerSingleResponse(RemovedResponseDto)
  @Delete(':roleId/permissions/:permissionId')
  @ApiParam({ name: 'roleId', type: 'string' })
  @ApiParam({ name: 'permissionId', type: 'string' })
  @ResponseMessage('Permission removed from role successfully')
  async removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ): Promise<SingleResponse<{ removed: boolean }>> {
    return await this.rolesService.removePermissionFromRole(
      roleId,
      permissionId,
    );
  }
}
