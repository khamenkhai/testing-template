import { Controller, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { ApiSwaggerSingleResponse } from 'src/common/decorators/api-response.decorator';
import type { SingleResponse } from 'src/common/interfaces/api-response.interface';
import { User } from 'src/database/generated/prisma/client';
import { UserResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiSwaggerSingleResponse(UserResponseDto)
  @Patch(':id/role')
  @ApiParam({ name: 'id', description: 'User ID' })
  @ResponseMessage('Role assigned successfully')
  async assignRole(
    @Param('id') userId: string,
    @Body() dto: AssignRoleDto,
  ): Promise<SingleResponse<User>> {
    return await this.usersService.assignRole(userId, dto.roleId);
  }
}
