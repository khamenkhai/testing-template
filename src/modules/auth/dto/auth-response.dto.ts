import { ApiProperty } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/modules/auth/types/auth-request.interface';

export class AuthLoginResponseDto {
  @ApiProperty({ example: 'access-token-value' })
  access_token: string;

  @ApiProperty({ example: 'refresh-token-value' })
  refresh_token: string;

  @ApiProperty({ type: () => AuthenticatedUser })
  user: AuthenticatedUser;
}

export class AuthTokenPairResponseDto {
  @ApiProperty({ example: 'access-token-value' })
  access_token: string;

  @ApiProperty({ example: 'refresh-token-value' })
  refresh_token: string;
}

export class RegisterRoleResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Warehouse Owner' })
  name: string;
}

export class RegisterUserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Demo Owner' })
  username: string;

  @ApiProperty({ example: 'demo@example.com' })
  email: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  organizationId: string;

  @ApiProperty({ example: '2026-06-23T00:00:00.000Z' })
  createdAt: Date;
}

export class RegisterOrganizationResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Acme Corp' })
  name: string;

  @ApiProperty({ example: '2026-06-23T00:00:00.000Z' })
  createdAt: Date;
}

export class RegisterResponseDto {
  @ApiProperty({ type: () => RegisterUserResponseDto })
  user: RegisterUserResponseDto;

  @ApiProperty({ type: () => RegisterOrganizationResponseDto })
  organization: RegisterOrganizationResponseDto;

  @ApiProperty({ type: () => RegisterRoleResponseDto })
  role: RegisterRoleResponseDto;
}
