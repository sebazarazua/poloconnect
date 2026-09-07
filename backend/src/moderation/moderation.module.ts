import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { MediaModule } from "../common/media/media.module";
import { BlocksController } from "./blocks.controller";
import { ContentFilterService } from "./content-filter.service";
import { ModerationService } from "./moderation.service";
import { ReportsController } from "./reports.controller";

@Module({
  imports: [NotificationsModule, MediaModule],
  controllers: [ReportsController, BlocksController],
  providers: [ModerationService, ContentFilterService],
  exports: [ModerationService, ContentFilterService]
})
export class ModerationModule {}
