import { Controller, Get, Param, Query } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { AdminService } from "./admin.service";

@Public()
@Controller("content")
export class AdminPublicController {
  constructor(private readonly admin: AdminService) {}

  @Get("home")
  homeContent() {
    return this.admin.getPublicHomeContent();
  }

  @Get("section/:section")
  sectionContent(@Param("section") section: string, @Query("slot") slot?: string) {
    return this.admin.getPublicSection(section, slot);
  }
}
