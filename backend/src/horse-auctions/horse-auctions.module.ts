import { Module } from "@nestjs/common";
import { AdminHorseAuctionsController } from "./admin-horse-auctions.controller";
import { HorseAuctionsController } from "./horse-auctions.controller";
import { HorseAuctionsService } from "./horse-auctions.service";

@Module({
  controllers: [HorseAuctionsController, AdminHorseAuctionsController],
  providers: [HorseAuctionsService]
})
export class HorseAuctionsModule {}
