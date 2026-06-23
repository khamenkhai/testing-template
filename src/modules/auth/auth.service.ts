import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './types/jwt-payload';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SingleResponse } from 'src/common/interfaces/api-response.interface';
import { AuthenticatedUser } from './types/auth-request.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findOneByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    if (createUserDto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: createUserDto.roleId },
      });
      if (!role) {
        throw new BadRequestException('Invalid role ID');
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.usersService.create({
      email: createUserDto.email,
      username: createUserDto.username,
      roleId: createUserDto.roleId,
      password: hashedPassword,
    });
  }

  // Helper to build payload with fresh permissions
  private buildJwtPayload(user: any): JwtPayload {
    const permissions =
      user.role?.rolePermissions?.map((rp: any) => rp.permission.name) || [];

    return {
      sub: user.id,
      email: user.email,
      roleId: user.role?.id,
      roleName: user.role?.name,
      permissions: permissions,
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<
    SingleResponse<{
      access_token: string;
      refresh_token: string;
      user: AuthenticatedUser;
    }>
  > {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessTokenSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!accessTokenSecret || !refreshTokenSecret) {
      throw new Error('JWT secrets are not configured');
    }

    const payload = this.buildJwtPayload(user);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessTokenSecret,
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: refreshTokenSecret,
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
        },
      ),
    ]);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(hashedRefreshToken, user.id);

    return {
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          roleId: payload.roleId,
          roleName: payload.roleName,
          permissions: payload.permissions,
        },
      },
    };
  }

  async refreshNewTokens(refreshToken: string) {
    try {
      const refreshTokenSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!refreshTokenSecret)
        throw new UnauthorizedException('Refresh token secret not configured');

      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: refreshTokenSecret,
        },
      );

      const userId = payload.sub;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Access Denied');
      }

      const isMatching = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isMatching) {
        throw new UnauthorizedException('Invalid Token');
      }

      const accessTokenSecret =
        this.configService.get<string>('JWT_ACCESS_SECRET');
      if (!accessTokenSecret)
        throw new Error('JWT access secret is not configured');

      const newPayload = this.buildJwtPayload(user);

      const newAccessToken = await this.jwtService.signAsync(newPayload, {
        secret: accessTokenSecret,
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
      });

      const newRefreshToken = await this.jwtService.signAsync(
        { sub: user.id },
        { secret: refreshTokenSecret, expiresIn: '7d' },
      );

      const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
      await this.usersService.updateRefreshToken(
        hashedNewRefreshToken,
        user.id,
      );

      return {
        data: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<SingleResponse<{ message: string }>> {
    await this.usersService.update(userId, { refreshToken: '' });
    return { data: { message: 'Logged out successfully' } };
  }
}
