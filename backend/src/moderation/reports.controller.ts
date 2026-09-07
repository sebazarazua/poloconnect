import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { CsrfGuard } from "../common/guards/csrf.guard";
import { CreateReportDto } from "./dto/moderation.dto";
import { ModerationService } from "./moderation.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly moderation: ModerationService) {}

  @UseGuards(CsrfGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReportDto) {
    return this.moderation.createReport(user.id, dto);
  }
}
