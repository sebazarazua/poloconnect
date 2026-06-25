import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { MatchesQueryDto, UpdateLiveStateDto } from "./dto/matches.dto";
import { MatchesService } from "./matches.service";

@Controller()
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get("matches")
  list(@Query() query: MatchesQueryDto) {
    return this.matches.list(query);
  }

  @Get("matches/:id")
  detail(@Param("id") id: string) {
    return this.matches.detail(id);
  }

  @Get("matches/:id/events")
  events(@Param("id") id: string, @Query() query: MatchesQueryDto) {
    return this.matches.events(id, query);
  }

  @Get("broadcasts")
  broadcasts(@Query() query: MatchesQueryDto) {
    return this.matches.broadcasts(query);
  }

  @Roles("organizer", "admin")
  @Patch("matches/:id/live-state")
  updateLiveState(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: UpdateLiveStateDto) {
    return this.matches.updateLiveState(user.id, id, body);
  }
}
