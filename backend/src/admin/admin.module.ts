import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminPublicController, SpotlightEventsPublicController } from "./admin-public.controller";
import { AdminService } from "./admin.service";
import { BrandsModule } from "../brands/brands.module";
import { CommunityModule } from "../community/community.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [BrandsModule, CommunityModule, NotificationsModule],
  controllers: [AdminController, AdminPublicController, SpotlightEventsPublicController],
  providers: [AdminService],
  exports: [AdminService]
})
export class AdminModule {}
