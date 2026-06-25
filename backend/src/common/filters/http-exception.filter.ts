import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<{ headers: Record<string, string>; url: string }>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? exception.getResponse() : undefined;
    const message = typeof body === "object" && body && "message" in body ? (body as any).message : "Internal server error";

    response.status(status).json({
      error: {
        code: typeof body === "object" && body && "error" in body ? String((body as any).error).toUpperCase().replace(/ /g, "_") : "INTERNAL_ERROR",
        message,
        details: typeof body === "object" ? body : {},
        requestId: request.headers["x-request-id"] ?? null
      }
    });
  }
}
