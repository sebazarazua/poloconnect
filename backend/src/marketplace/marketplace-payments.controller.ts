import { Body, Controller, Headers, HttpCode, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { PaymentSyncDto } from "./dto/marketplace.dto";
import { MarketplaceService } from "./marketplace.service";

@Controller("marketplace/payments")
export class MarketplacePaymentsController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post("sync")
  syncReturn(@CurrentUser() user: RequestUser, @Body() body: PaymentSyncDto) {
    return this.marketplace.syncReturnedProductPayment(user, body.paymentId ?? "");
  }

  @Public()
  @HttpCode(200)
  @Post("webhook")
  webhook(@Query() query: Record<string, any>, @Body() body: any, @Headers() headers: Record<string, any>) {
    return this.marketplace.handleMercadoPagoWebhook({ query, body, headers });
  }
}
