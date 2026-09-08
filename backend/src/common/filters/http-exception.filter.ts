import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<{ headers: Record<string, string>; method: string; url: string }>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? exception.getResponse() : undefined;
    if (!isHttp) {
      this.logger.error(`${request.method} ${request.url}: ${exception instanceof Error ? exception.message : String(exception)}`);
    }
    const message = typeof body === "object" && body && "message" in body ? (body as any).message : "Internal server error";
    const normalizedMessage = message === "File too large"
      ? "La imagen supera el límite permitido de 8 MB."
      : message === "Unexpected end of form"
      ? "No se pudo leer la imagen enviada."
      : message;

    response.status(status).json({
      error: {
        code: typeof body === "object" && body && "error" in body ? String((body as any).error).toUpperCase().replace(/ /g, "_") : "INTERNAL_ERROR",
        message: normalizedMessage,
        details: typeof body === "object" ? body : {},
        requestId: request.headers["x-request-id"] ?? null
      }
    });
  }
}
