import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminPublicController, SpotlightEventsPublicController } from "./admin-public.controller";
import { AdminService } from "./admin.service";
import { BrandsModule } from "../brands/brands.module";

@Module({
  imports: [BrandsModule],
  controllers: [AdminController, AdminPublicController, SpotlightEventsPublicController],
  providers: [AdminService],
  exports: [AdminService]
})
export class AdminModule {}
