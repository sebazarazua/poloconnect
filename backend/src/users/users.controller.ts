import { BadRequestException, Body, Controller, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { existsSync, mkdirSync } from "fs";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { CsrfGuard } from "../common/guards/csrf.guard";
import { PrismaService } from "../database/prisma.service";

@Controller("users")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  private static storageName(req: any, file: any, callback: (error: Error | null, filename: string) => void) {
    const safeExt = extname(file.originalname || "").replace(/[^a-zA-Z0-9.]/g, "") || ".jpg";
    callback(null, `${req.user?.sub ?? "user"}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }

  private static avatarDestination(_req: any, _file: any, callback: (error: Error | null, destination: string) => void) {
    const destination = join(process.cwd(), "uploads", "avatars");
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

  private toAuthUser(user: any) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      phone: user.phone ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      roles: user.roles?.map((entry: any) => entry.role.code) ?? []
    };
  }

  @Get("me")
  async me(@CurrentUser() user: RequestUser) {
    const data = await this.prisma.user.findUnique({ where: { id: user.id }, include: { settings: true, roles: { include: { role: true } } } });
    return { ...data, roles: data?.roles.map((entry) => entry.role.code) ?? [] };
  }

  @UseGuards(CsrfGuard)
  @Patch("me")
  async updateMe(@CurrentUser() user: RequestUser, @Body() body: { firstName?: string; lastName?: string; phone?: string; handicap?: number }) {
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();

    if (firstName !== undefined && firstName.length < 2) {
      throw new BadRequestException("First name must have at least 2 characters.");
    }

    if (lastName !== undefined && lastName.length < 2) {
      throw new BadRequestException("Last name must have at least 2 characters.");
    }

    const data = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.handicap !== undefined ? { handicap: body.handicap } : {})
      },
      include: { roles: { include: { role: true } } }
    });

    return this.toAuthUser(data);
  }

  @UseGuards(CsrfGuard)
  @Post("me/avatar")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({ destination: UsersController.avatarDestination, filename: UsersController.storageName }),
      fileFilter: UsersController.imageFileFilter,
      limits: { fileSize: 6 * 1024 * 1024 }
    })
  )
  async uploadAvatar(@CurrentUser() user: RequestUser, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException("Image file is required.");
    }

    const path = `/uploads/avatars/${file.filename}`;
    const data = await this.prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: path },
      include: { roles: { include: { role: true } } }
    });

    return this.toAuthUser(data);
  }
}
