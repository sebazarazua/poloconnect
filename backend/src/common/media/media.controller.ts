import { Controller, Get, NotFoundException, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { Public } from "../decorators/public.decorator";
import { MediaService } from "./media.service";

@Public()
@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get("media/*")
  async getMedia(@Req() req: Request, @Res() res: Response) {
    const wildcardPath = (req.params as any)?.path ?? (req.params as any)?.[0] ?? "";
    const rawPath = Array.isArray(wildcardPath) ? wildcardPath.join("/") : String(wildcardPath || "");
    const storageKey = decodeURIComponent(rawPath || "").replace(/^\/+/, "");
    if (!storageKey) {
      throw new NotFoundException("Media file not found.");
    }

    const object = await this.media.fetchMedia(storageKey);
    const body = object.Body as NodeJS.ReadableStream | undefined;
    if (!body) {
      throw new NotFoundException("Media file not found.");
    }

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (object.ContentType) res.setHeader("Content-Type", object.ContentType);
    if (typeof object.ContentLength === "number") res.setHeader("Content-Length", String(object.ContentLength));

    body.pipe(res);
  }
}