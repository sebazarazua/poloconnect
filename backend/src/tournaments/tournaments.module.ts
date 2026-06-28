import { Module } from "@nestjs/common";
import { TournamentsController } from "./tournaments.controller";
import { TournamentsService } from "./tournaments.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({ imports: [NotificationsModule], controllers: [TournamentsController], providers: [TournamentsService] })
export class TournamentsModule {}
