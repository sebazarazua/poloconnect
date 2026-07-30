import { Controller, Get, Param } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { BrandsService } from "./brands.service";

@Controller("brands")
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Public()
  @Get()
  list() {
    return this.brands.listBrands();
  }

  @Public()
  @Get(":id")
  detail(@Param("id") id: string) {
    return this.brands.getBrand(id);
  }

  @Public()
  @Get(":id/products")
  products(@Param("id") id: string) {
    return this.brands.listBrandProducts(id);
  }
}
