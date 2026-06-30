import { Controller, Get, Param } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { HorseAuctionsService } from "./horse-auctions.service";

@Public()
@Controller("horse-auctions")
export class HorseAuctionsController {
  constructor(private readonly auctions: HorseAuctionsService) {}

  @Get()
  list() {
    return this.auctions.list();
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.auctions.detail(id);
  }
}
