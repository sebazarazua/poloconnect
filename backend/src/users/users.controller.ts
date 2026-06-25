import { Body, Controller, Get, Patch } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../database/prisma.service";

@Controller("users")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  async me(@CurrentUser() user: RequestUser) {
    const data = await this.prisma.user.findUnique({ where: { id: user.id }, include: { settings: true, roles: { include: { role: true } } } });
    return { ...data, roles: data?.roles.map((entry) => entry.role.code) ?? [] };
  }

  @Patch("me")
  updateMe(@CurrentUser() user: RequestUser, @Body() body: { phone?: string; avatarUrl?: string; handicap?: number }) {
    return this.prisma.user.update({ where: { id: user.id }, data: { phone: body.phone, avatarUrl: body.avatarUrl, handicap: body.handicap } });
  }
}
