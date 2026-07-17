import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './types/jwt-payload';
import { RegisterUserDto } from './dto/register-user.dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SingleResponse } from 'src/common/interfaces/api-response.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async register(dto: RegisterUserDto): Promise<SingleResponse<any>> {
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const { user, role } = await this.prisma.$transaction(async (tx) => {
      const allPermissions = await tx.permission.findMany({
        where: { isDeleted: false },
      });

      let adminRole = await tx.role.findFirst({
        where: { name: 'admin' },
      });

      if (!adminRole) {
        adminRole = await tx.role.create({
          data: {
            name: 'admin',
            rolePermissions: {
              create: allPermissions.map((p) => ({
                permissionId: p.id,
              })),
            },
          },
        });
      }

      const user = await tx.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          password: hashedPassword,
          roleId: adminRole.id,
        },
        select: {
          id: true,
          username: true,
          email: true,
          roleId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { user, role: adminRole };
    });

    return { data: { user, role } };
  }

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
      user: any;
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

    if (!user || user.isDeleted || !user.password) {
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

      if (!user || user.isDeleted || !user.refreshToken) {
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
    await this.usersService.updateRefreshToken('', userId);
    return { data: { message: 'Logged out successfully' } };
  }

  async getProfile(userId: string) {
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

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions =
      user.role?.rolePermissions?.map((rp: any) => rp.permission.name) || [];

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      roleId: user.role?.id,
      roleName: user.role?.name,
      permissions,
    };
  }
}
