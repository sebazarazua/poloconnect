import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseCookieHeader } from "../utils/cookies";

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  private isTrustedOrigin(origin?: string) {
    if (!origin) return false;

    const allowedOrigins = this.config
      .get<string>("CORS_ORIGIN", "*")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (allowedOrigins.includes("*")) {
      return true;
    }

    return allowedOrigins.some((allowedOrigin) => origin === allowedOrigin || origin.startsWith(`${allowedOrigin}/`));
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<any>();
    const method = String(request.method ?? "GET").toUpperCase();

    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return true;
    }

    const cookies = parseCookieHeader(request.headers?.cookie);
    const csrfCookie = cookies.pc_csrf;
    const csrfHeader = request.headers?.["x-csrf-token"];
    const origin = request.headers?.origin;

    if (!csrfCookie && csrfHeader && this.isTrustedOrigin(origin)) {
      return true;
    }

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException("Invalid CSRF token.");
    }

    return true;
  }
}
