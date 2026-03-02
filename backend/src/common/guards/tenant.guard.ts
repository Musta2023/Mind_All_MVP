import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT

    if (!user || !user.tenantId) {
      throw new ForbiddenException('User or tenant not found in JWT');
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    // Attach to request for use in services
    request.tenant = tenant;
    return true;
  }
}
