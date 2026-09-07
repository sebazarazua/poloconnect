import { Module } from "@nestjs/common";
import { AccountDeletionService } from "./account-deletion.service";
import { UsersController } from "./users.controller";
import { ModerationModule } from "../moderation/moderation.module";

@Module({ imports: [ModerationModule], controllers: [UsersController], providers: [AccountDeletionService] })
export class UsersModule {}
