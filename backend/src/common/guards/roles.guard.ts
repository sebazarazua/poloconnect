import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<any>();
    const userRoles: string[] = request.user?.roles ?? [];
    if (required.some((role) => userRoles.includes(role) || userRoles.includes("admin") || userRoles.includes("superadmin"))) return true;
    throw new ForbiddenException("Insufficient permissions.");
  }
}
