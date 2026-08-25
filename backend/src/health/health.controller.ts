import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../database/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  health() {
    return { status: "ok", service: "poloconnect-backend", timestamp: new Date().toISOString() };
  }

  @Public()
  @Get("ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", checks: { database: "ok" }, timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: "error", checks: { database: "unavailable" } });
    }
  }
}
