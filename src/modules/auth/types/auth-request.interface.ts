import { ApiProperty } from '@nestjs/swagger';

export class AuthenticatedUser {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  roleId: string;

  @ApiProperty()
  roleName: string;

  @ApiProperty({ type: [String] })
  permissions: string[];
}

export class RequestWithUser extends Request {
  user: AuthenticatedUser;
}
