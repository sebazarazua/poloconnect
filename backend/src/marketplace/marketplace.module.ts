import { Module } from "@nestjs/common";
import { FavoritesController } from "./favorites.controller";
import { MarketplacePaymentsController } from "./marketplace-payments.controller";
import { MarketplaceService } from "./marketplace.service";
import { MercadoPagoService } from "./mercadopago.service";
import { ProductsController } from "./products.controller";

@Module({
  controllers: [ProductsController, FavoritesController, MarketplacePaymentsController],
  providers: [MarketplaceService, MercadoPagoService],
  exports: [MarketplaceService]
})
export class MarketplaceModule {}
