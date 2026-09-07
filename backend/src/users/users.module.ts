import { Module } from "@nestjs/common";
import { AccountDeletionService } from "./account-deletion.service";
import { UsersController } from "./users.controller";

@Module({ controllers: [UsersController], providers: [AccountDeletionService] })
export class UsersModule {}
