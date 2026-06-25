import { Body, Controller, Get, Post, Put, Req, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { parseCookieHeader } from "../common/utils/cookies";
import { AuthService } from "./auth.service";
import { ChangePasswordDto, LoginDto, RefreshDto, RegisterDto } from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  private applyAuthCookies(res: any, tokens: { refreshToken: string; csrfToken: string }) {
    const isProd = this.config.get<string>("NODE_ENV") === "production";
    const refreshDays = Number(this.config.get("REFRESH_TOKEN_DAYS", 30));
    const cookieBase = `Path=/; Max-Age=${refreshDays * 24 * 60 * 60}; SameSite=Lax${isProd ? "; Secure" : ""}`;

    res.setHeader("Set-Cookie", [
      `pc_refresh=${encodeURIComponent(tokens.refreshToken)}; HttpOnly; ${cookieBase}`,
      `pc_csrf=${encodeURIComponent(tokens.csrfToken)}; ${cookieBase}`
    ]);
  }

  private clearAuthCookies(res: any) {
    const isProd = this.config.get<string>("NODE_ENV") === "production";
    const cookieBase = `Path=/; Max-Age=0; SameSite=Lax${isProd ? "; Secure" : ""}`;
    res.setHeader("Set-Cookie", [`pc_refresh=; HttpOnly; ${cookieBase}`, `pc_csrf=; ${cookieBase}`]);
  }

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto, @Req() req: any) {
    return this.auth.register(dto, req).then((tokens) => {
      this.applyAuthCookies(req.res, tokens);
      return tokens;
    });
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.auth.login(dto, req).then((tokens) => {
      this.applyAuthCookies(req.res, tokens);
      return tokens;
    });
  }

  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshDto, @Req() req: any) {
    const cookies = parseCookieHeader(req.headers?.cookie);
    const refreshToken = dto.refreshToken ?? cookies.pc_refresh;
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token.");
    }

    return this.auth.refresh(refreshToken, req).then((tokens) => {
      this.applyAuthCookies(req.res, tokens);
      return tokens;
    });
  }

  @Post("logout")
  logout(@CurrentUser() user: RequestUser, @Req() req: any) {
    this.clearAuthCookies(req.res);
    return this.auth.logout(user.sessionId);
  }

  @Post("logout-all")
  logoutAll(@CurrentUser() user: RequestUser, @Req() req: any) {
    this.clearAuthCookies(req.res);
    return this.auth.logoutAll(user.id);
  }

  @Get("me")
  me(@CurrentUser() user: RequestUser) {
    return this.auth.getMe(user.id);
  }

  @Put("me/password")
  changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }
}
