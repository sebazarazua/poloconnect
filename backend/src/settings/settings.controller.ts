import { Body, Controller, Get, Patch } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../database/prisma.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  get(@CurrentUser() user: RequestUser) {
    return this.prisma.userSettings.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  }

  @Patch("me")
  update(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        locale: body.locale,
        theme: body.theme,
        pushEnabled: body.pushEnabled,
        emailEnabled: body.emailEnabled,
        profileVisibility: body.profileVisibility
      },
      create: { userId: user.id, ...body }
    });
  }
}
