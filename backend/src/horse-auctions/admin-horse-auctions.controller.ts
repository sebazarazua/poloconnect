import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { memoryStorage } from "multer";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { HorseAuctionsService } from "./horse-auctions.service";
import { UpsertHorseAuctionEventDto, UpsertHorseAuctionHorseDto } from "./dto/upsert-horse-auction-event.dto";
import { MediaService } from "../common/media/media.service";

@Roles("admin", "superadmin")
@Controller("admin/horse-auctions")
export class AdminHorseAuctionsController {
  constructor(private readonly auctions: HorseAuctionsService, private readonly media: MediaService) {}

  private static imageFileFilter(_req: any, file: any, callback: (error: Error | null, acceptFile: boolean) => void) {
    if (!String(file.mimetype).startsWith("image/")) {
      callback(new BadRequestException("Only image files are allowed."), false);
      return;
    }

    callback(null, true);
  }

  @Get()
  list() {
    return this.auctions.adminList();
  }

  @Post()
  createEvent(@CurrentUser() user: RequestUser, @Body() dto: UpsertHorseAuctionEventDto) {
    return this.auctions.adminCreateEvent(user, dto);
  }

  @Put(":eventId")
  updateEvent(@CurrentUser() user: RequestUser, @Param("eventId") eventId: string, @Body() dto: UpsertHorseAuctionEventDto) {
    return this.auctions.adminUpdateEvent(user, eventId, dto);
  }

  @Delete(":eventId")
  deleteEvent(@CurrentUser() user: RequestUser, @Param("eventId") eventId: string) {
    return this.auctions.adminDeleteEvent(user, eventId);
  }

  @Post(":eventId/horses")
  createHorse(@CurrentUser() user: RequestUser, @Param("eventId") eventId: string, @Body() dto: UpsertHorseAuctionHorseDto) {
    return this.auctions.adminCreateHorse(user, eventId, dto);
  }

  @Put("horses/:horseId")
  updateHorse(@CurrentUser() user: RequestUser, @Param("horseId") horseId: string, @Body() dto: UpsertHorseAuctionHorseDto) {
    return this.auctions.adminUpdateHorse(user, horseId, dto);
  }

  @Delete("horses/:horseId")
  deleteHorse(@CurrentUser() user: RequestUser, @Param("horseId") horseId: string) {
    return this.auctions.adminDeleteHorse(user, horseId);
  }

  @Post("upload/event")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: AdminHorseAuctionsController.imageFileFilter,
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadEventImage(@UploadedFile() file: any) {
    return this.media.uploadImage("horse-auctions/events", file);
  }

  @Post("upload/horse")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: AdminHorseAuctionsController.imageFileFilter,
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadHorseImage(@UploadedFile() file: any) {
    return this.media.uploadImage("horse-auctions/horses", file);
  }
}
