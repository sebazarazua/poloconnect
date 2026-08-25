import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import * as express from "express";
import helmet from "helmet";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { AppModule } from "./app.module";
import { createCorsOptions } from "./common/config/origins";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ConfiguredSocketIoAdapter } from "./common/websockets/configured-socket-io.adapter";

function trustProxyValue(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "false" || normalized === "0" || normalized === "off") return null;
  if (normalized === "true" || normalized === "1" || normalized === "on") return 1;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : value;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const prefix = config.get<string>("API_PREFIX", "api/v1");
  const trustProxy = trustProxyValue(config.get<string>("TRUST_PROXY"));

  if (trustProxy !== null) {
    app.getHttpAdapter().getInstance().set("trust proxy", trustProxy);
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.enableCors(createCorsOptions(config));
  app.useWebSocketAdapter(new ConfiguredSocketIoAdapter(app, config));
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const uploadsDir = join(process.cwd(), "uploads");
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  await app.listen(config.get<number>("PORT", 4000), "0.0.0.0");
}

void bootstrap();
