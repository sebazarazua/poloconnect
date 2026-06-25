import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<any>();
    const authHeader = request.headers.authorization as string | undefined;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("Missing access token.");

    try {
      const payload = await this.jwt.verifyAsync(token, { secret: this.config.get<string>("JWT_ACCESS_SECRET") });
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null, status: "active" },
        include: { roles: { include: { role: true } } }
      });
      if (!user) throw new UnauthorizedException("Invalid access token.");
      request.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        roles: user.roles.map((entry) => entry.role.code),
        sessionId: payload.sessionId
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token.");
    }
  }
}
