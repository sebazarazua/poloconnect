import { BadRequestException, Body, Controller, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { memoryStorage } from "multer";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { CsrfGuard } from "../common/guards/csrf.guard";
import { PrismaService } from "../database/prisma.service";
import { MediaService } from "../common/media/media.service";

@Controller("users")
export class UsersController {
  constructor(private readonly prisma: PrismaService, private readonly media: MediaService) {}

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
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post("me/avatar")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: UsersController.imageFileFilter,
      limits: { fileSize: 6 * 1024 * 1024 }
    })
  )
  async uploadAvatar(@CurrentUser() user: RequestUser, @UploadedFile() file: any) {
    const uploaded = await this.media.uploadImage("avatars", file);
    const data = await this.prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: uploaded.url },
      include: { roles: { include: { role: true } } }
    });

    return this.toAuthUser(data);
  }
}
