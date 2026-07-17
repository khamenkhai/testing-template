import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { ApiSwaggerSingleResponse } from 'src/common/decorators/api-response.decorator';
import type { SingleResponse } from 'src/common/interfaces/api-response.interface';
import { AuthenticatedUser } from './types/auth-request.interface';
import {
  AuthLoginResponseDto,
  AuthTokenPairResponseDto,
  MessageResponseDto,
  RegisterResponseDto,
} from 'src/common/dto/response.dto';

@ApiTags('Auth')
@Controller('')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiSwaggerSingleResponse(RegisterResponseDto)
  @Post('register')
  @ResponseMessage('User successfully registered')
  async register(
    @Body() dto: RegisterUserDto,
  ): Promise<SingleResponse<RegisterResponseDto>> {
    return await this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiSwaggerSingleResponse(AuthLoginResponseDto)
  @Post('login')
  @ResponseMessage('User successfully logged in')
  async login(@Body() loginDto: LoginDto): Promise<
    SingleResponse<{
      access_token: string;
      refresh_token: string;
      user: AuthenticatedUser;
    }>
  > {
    return await this.authService.login(loginDto.email, loginDto.password);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiSwaggerSingleResponse(AuthTokenPairResponseDto)
  @Post('refresh')
  @ResponseMessage('Token successfully refreshed')
  async refresh(
    @Body() refreshDto: RefreshDto,
  ): Promise<SingleResponse<{ access_token: string; refresh_token: string }>> {
    return await this.authService.refreshNewTokens(refreshDto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  @ApiSwaggerSingleResponse(MessageResponseDto)
  @Post('logout')
  @ResponseMessage('User successfully logged out')
  async logout(@Request() req): Promise<SingleResponse<{ message: string }>> {
    return await this.authService.logout(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user profile' })
  @ApiSwaggerSingleResponse(AuthenticatedUser)
  @Get('profile')
  @ResponseMessage('User profile fetched successfully')
  async getProfile(@Request() req): Promise<SingleResponse<any>> {
    const user = await this.authService.getProfile(req.user.id);
    return { data: user };
  }
}
