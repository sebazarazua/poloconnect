import { INestApplicationContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createCorsOptions } from "../config/origins";

export class ConfiguredSocketIoAdapter extends IoAdapter {
  constructor(app: INestApplicationContext, private readonly config: ConfigService) {
    super(app);
  }

  createIOServer(port: number, options?: Record<string, unknown>) {
    return super.createIOServer(port, {
      ...options,
      cors: createCorsOptions(this.config)
    });
  }
}
