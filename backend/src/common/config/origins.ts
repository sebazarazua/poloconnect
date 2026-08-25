import { ConfigService } from "@nestjs/config";

const DEV_ORIGINS = ["http://localhost:8081", "http://localhost:19006", "http://localhost:3000"];

function parseOrigins(raw?: string) {
  return (raw ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAllowedOrigins(config: ConfigService) {
  const nodeEnv = config.get<string>("NODE_ENV", "development");
  const rawOrigin = config.get<string>("CORS_ORIGIN");

  if (!rawOrigin?.trim()) {
    return nodeEnv === "production" ? [] : DEV_ORIGINS;
  }

  if (rawOrigin.trim() === "*") {
    if (nodeEnv === "production") {
      throw new Error("CORS_ORIGIN='*' is not allowed when NODE_ENV=production and credentials are enabled.");
    }

    return "*";
  }

  return parseOrigins(rawOrigin);
}

export function createCorsOrigin(config: ConfigService) {
  const allowedOrigins = getAllowedOrigins(config);

  return (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins === "*" || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin is not allowed by CORS."), false);
  };
}

export function createCorsOptions(config: ConfigService) {
  return {
    origin: createCorsOrigin(config),
    credentials: true
  };
}
