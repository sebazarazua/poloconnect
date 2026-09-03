import { Body, Controller, Headers, HttpCode, Post, Query } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { MarketplaceService } from "./marketplace.service";

@Controller("marketplace/payments")
export class MarketplacePaymentsController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Public()
  @HttpCode(200)
  @Post("webhook")
  webhook(@Query() query: Record<string, any>, @Body() body: any, @Headers() headers: Record<string, any>) {
    return this.marketplace.handleMercadoPagoWebhook({ query, body, headers });
  }
}
