import { Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";
import { MarketplaceService } from "./marketplace.service";

@Controller()
export class FavoritesController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get("favorites")
  list(@CurrentUser() user: RequestUser, @Query() query: PaginationDto) {
    return this.marketplace.listFavorites(user.id, query);
  }

  @Post("products/:id/favorite")
  add(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.addFavorite(user.id, id);
  }

  @Delete("products/:id/favorite")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.removeFavorite(user.id, id);
  }
}
