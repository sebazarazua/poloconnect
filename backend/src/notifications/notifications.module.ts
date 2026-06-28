import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsGateway } from "./notifications.gateway";
import { NotificationsService } from "./notifications.service";
import { SettingsModule } from "../settings/settings.module";

@Module({ imports: [SettingsModule], controllers: [NotificationsController], providers: [NotificationsService, NotificationsGateway], exports: [NotificationsService] })
export class NotificationsModule {}
