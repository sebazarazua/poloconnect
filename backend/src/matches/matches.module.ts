import { Module } from "@nestjs/common";
import { MatchesGateway } from "./matches.gateway";
import { MatchesController } from "./matches.controller";
import { MatchesService } from "./matches.service";

@Module({ controllers: [MatchesController], providers: [MatchesService, MatchesGateway] })
export class MatchesModule {}
