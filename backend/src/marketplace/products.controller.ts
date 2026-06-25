import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { ContactSellerDto, ProductQueryDto, ProductUpsertDto } from "./dto/marketplace.dto";
import { MarketplaceService } from "./marketplace.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ProductQueryDto) {
    return this.marketplace.listProducts(user.id, query);
  }

  @Get("me")
  mine(@CurrentUser() user: RequestUser, @Query() query: ProductQueryDto) {
    return this.marketplace.listProducts(user.id, { ...query, sellerId: user.id, status: undefined });
  }

  @Get(":id")
  detail(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.getProduct(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: ProductUpsertDto) {
    return this.marketplace.createProduct(user, body);
  }

  @Put(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: ProductUpsertDto) {
    return this.marketplace.updateProduct(user, id, body);
  }

  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.marketplace.deleteProduct(user, id);
  }

  @Post(":id/contact")
  contact(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: ContactSellerDto) {
    return this.marketplace.contactSeller(user.id, id, body);
  }
}
