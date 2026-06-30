import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { existsSync, mkdirSync } from "fs";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { HorseAuctionsService } from "./horse-auctions.service";
import { UpsertHorseAuctionEventDto, UpsertHorseAuctionHorseDto } from "./dto/upsert-horse-auction-event.dto";

@Roles("admin", "superadmin")
@Controller("admin/horse-auctions")
export class AdminHorseAuctionsController {
  constructor(private readonly auctions: HorseAuctionsService, private readonly config: ConfigService) {}

  private static storageName(_req: any, file: any, callback: (error: Error | null, filename: string) => void) {
    const safeExt = extname(file.originalname || "").replace(/[^a-zA-Z0-9.]/g, "") || ".jpg";
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }

  private static eventImageDestination(_req: any, _file: any, callback: (error: Error | null, destination: string) => void) {
    const destination = join(process.cwd(), "uploads", "horse-auctions", "events");
    if (!existsSync(destination)) {
      mkdirSync(destination, { recursive: true });
    }
    callback(null, destination);
  }

  private static horseImageDestination(_req: any, _file: any, callback: (error: Error | null, destination: string) => void) {
    const destination = join(process.cwd(), "uploads", "horse-auctions", "horses");
    if (!existsSync(destination)) {
      mkdirSync(destination, { recursive: true });
    }
    callback(null, destination);
  }

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
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({ destination: AdminHorseAuctionsController.eventImageDestination, filename: AdminHorseAuctionsController.storageName }),
      fileFilter: AdminHorseAuctionsController.imageFileFilter,
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadEventImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException("Image file is required.");
    }

    const baseUrl = this.config.get<string>("PUBLIC_BASE_URL")?.trim();
    const path = `/uploads/horse-auctions/events/${file.filename}`;
    const url = baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
    return { url, filename: file.filename, mimetype: file.mimetype, size: file.size };
  }

  @Post("upload/horse")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({ destination: AdminHorseAuctionsController.horseImageDestination, filename: AdminHorseAuctionsController.storageName }),
      fileFilter: AdminHorseAuctionsController.imageFileFilter,
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadHorseImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException("Image file is required.");
    }

    const baseUrl = this.config.get<string>("PUBLIC_BASE_URL")?.trim();
    const path = `/uploads/horse-auctions/horses/${file.filename}`;
    const url = baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
    return { url, filename: file.filename, mimetype: file.mimetype, size: file.size };
  }
}
