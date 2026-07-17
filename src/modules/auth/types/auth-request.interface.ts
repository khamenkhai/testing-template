import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthenticatedUser {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional({ nullable: true })
  roleId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  roleName?: string | null;

  @ApiProperty({ type: [String] })
  permissions: string[];
}

export class RequestWithUser extends Request {
  user: AuthenticatedUser;
}
