import { Module } from "@nestjs/common";
import { FavoritesController } from "./favorites.controller";
import { MarketplacePaymentsController } from "./marketplace-payments.controller";
import { MarketplaceService } from "./marketplace.service";
import { MercadoPagoService } from "./mercadopago.service";
import { ProductsController } from "./products.controller";
import { ModerationModule } from "../moderation/moderation.module";
import { MarketplaceRefundsService } from "./marketplace-refunds.service";

@Module({
  imports: [ModerationModule],
  controllers: [ProductsController, FavoritesController, MarketplacePaymentsController],
  providers: [MarketplaceService, MercadoPagoService, MarketplaceRefundsService],
  exports: [MarketplaceService]
})
export class MarketplaceModule {}
