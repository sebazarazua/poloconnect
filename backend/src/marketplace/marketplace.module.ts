import { Module } from "@nestjs/common";
import { FavoritesController } from "./favorites.controller";
import { MarketplaceService } from "./marketplace.service";
import { ProductsController } from "./products.controller";

@Module({ controllers: [ProductsController, FavoritesController], providers: [MarketplaceService] })
export class MarketplaceModule {}
