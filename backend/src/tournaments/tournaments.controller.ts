import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { RegisterTeamDto, TournamentsQueryDto } from "./dto/tournaments.dto";
import { TournamentsService } from "./tournaments.service";

@Controller("tournaments")
export class TournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  @Get()
  list(@Query() query: TournamentsQueryDto) {
    return this.tournaments.list(query);
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.tournaments.detail(id);
  }

  @Post(":id/register-team")
  register(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: RegisterTeamDto) {
    return this.tournaments.registerTeam(user.id, id, body);
  }

  @Get(":id/registrations")
  registrations(@Param("id") id: string) {
    return this.tournaments.registrations(id);
  }
}
