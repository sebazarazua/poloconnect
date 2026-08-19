import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { CsrfGuard } from "../common/guards/csrf.guard";
import { ContactSellerDto, ProductQueryDto, ProductUpsertDto } from "./dto/marketplace.dto";
import { MarketplaceService } from "./marketplace.service";
import { MediaService } from "../common/media/media.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly marketplace: MarketplaceService, private readonly media: MediaService) {}

  private static imageFileFilter(_req: any, file: any, callback: (error: Error | null, acceptFile: boolean) => void) {
    if (!String(file.mimetype).startsWith("image/")) {
      callback(new BadRequestException("Only image files are allowed."), false);
      return;
    }

    callback(null, true);
  }

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

  @UseGuards(CsrfGuard)
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: ProductsController.imageFileFilter,
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadProductImage(@UploadedFile() file: any) {
    return this.media.uploadImage("products", file);
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
