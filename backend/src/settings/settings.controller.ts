import { Body, Controller, Get, Patch } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { SettingsService } from "./settings.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get("me")
  get(@CurrentUser() user: RequestUser) {
    return this.settings.getMe(user.id);
  }

  @Patch("me")
  update(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.settings.updateMe(user.id, body);
  }
}
