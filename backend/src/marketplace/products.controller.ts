import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { existsSync, mkdirSync } from "fs";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { CsrfGuard } from "../common/guards/csrf.guard";
import { ContactSellerDto, ProductQueryDto, ProductUpsertDto } from "./dto/marketplace.dto";
import { MarketplaceService } from "./marketplace.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly marketplace: MarketplaceService) {}

  private static storageName(req: any, file: any, callback: (error: Error | null, filename: string) => void) {
    const safeExt = extname(file.originalname || "").replace(/[^a-zA-Z0-9.]/g, "") || ".jpg";
    callback(null, `${req.user?.sub ?? "product"}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }

  private static productImageDestination(_req: any, _file: any, callback: (error: Error | null, destination: string) => void) {
    const destination = join(process.cwd(), "uploads", "products");
    if (!existsSync(destination)) {
      mkdirSync(destination, { recursive: true });
    }
    callback(null, destination);
  }

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
      storage: diskStorage({ destination: ProductsController.productImageDestination, filename: ProductsController.storageName }),
      fileFilter: ProductsController.imageFileFilter,
      limits: { fileSize: 8 * 1024 * 1024 }
    })
  )
  uploadProductImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException("Image file is required.");
    }

    const path = `/uploads/products/${file.filename}`;
    return { url: path, filename: file.filename, mimetype: file.mimetype, size: file.size };
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
