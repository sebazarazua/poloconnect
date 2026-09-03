import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminPublicController, SpotlightEventsPublicController } from "./admin-public.controller";
import { AdminService } from "./admin.service";
import { BrandsModule } from "../brands/brands.module";
import { CommunityModule } from "../community/community.module";

@Module({
  imports: [BrandsModule, CommunityModule],
  controllers: [AdminController, AdminPublicController, SpotlightEventsPublicController],
  providers: [AdminService],
  exports: [AdminService]
})
export class AdminModule {}
