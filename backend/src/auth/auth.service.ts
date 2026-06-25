import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { randomBytes, randomUUID } from "crypto";
import { PrismaService } from "../database/prisma.service";
import { ChangePasswordDto, LoginDto, RegisterDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto, req: any) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) throw new ConflictException("Email or username already exists.");

    const passwordHash = await argon2.hash(dto.password);
    const playerRole = await this.ensureRole("player", "Player");
    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        username,
        phone: dto.phone?.trim() || null,
        credential: { create: { passwordHash } },
        settings: { create: {} },
        roles: { create: { roleId: playerRole.id } }
      },
      include: { roles: { include: { role: true } } }
    });

    return this.issueTokens(user, req);
  }

  async login(dto: LoginDto, req: any) {
    const identifier = dto.identifier.trim().toLowerCase();
    const maxFailedAttempts = Number(this.config.get("AUTH_MAX_FAILED_ATTEMPTS", 5));
    const lockMinutes = Number(this.config.get("AUTH_LOCK_MINUTES", 15));

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }], deletedAt: null, status: "active" },
      include: { credential: true, roles: { include: { role: true } } }
    });
    if (!user?.credential) throw new UnauthorizedException("Invalid credentials.");

    if (user.credential.lockedUntil && user.credential.lockedUntil > new Date()) {
      throw new UnauthorizedException("Account temporarily locked. Try again later.");
    }

    const valid = await argon2.verify(user.credential.passwordHash, dto.password);
    if (!valid) {
      const nextFailedCount = user.credential.failedLoginCount + 1;
      const lockUntil = nextFailedCount >= maxFailedAttempts ? new Date(Date.now() + lockMinutes * 60 * 1000) : null;
      await this.prisma.authCredential.update({
        where: { userId: user.id },
        data: { failedLoginCount: nextFailedCount, lockedUntil: lockUntil }
      });
      throw new UnauthorizedException("Invalid credentials.");
    }

    if (user.credential.failedLoginCount > 0 || user.credential.lockedUntil) {
      await this.prisma.authCredential.update({
        where: { userId: user.id },
        data: { failedLoginCount: 0, lockedUntil: null }
      });
    }

    return this.issueTokens(user, req);
  }

  async refresh(refreshToken: string, req: any) {
    const tokenHash = await argon2.hash(refreshToken);
    const sessions = await this.prisma.authSession.findMany({ where: { revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: { include: { roles: { include: { role: true } } } } } });
    const session = await this.findMatchingSession(sessions, refreshToken);
    if (!session) throw new UnauthorizedException("Invalid refresh token.");
    await this.prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(session.user, req, session.familyId);
  }

  async logout(sessionId?: string) {
    if (sessionId) await this.prisma.authSession.updateMany({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  async logoutAll(userId: string) {
    await this.prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
    if (!user) throw new UnauthorizedException();
    return this.toAuthUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const credential = await this.prisma.authCredential.findUnique({ where: { userId } });
    if (!credential) throw new BadRequestException("Credential not found.");
    const valid = await argon2.verify(credential.passwordHash, dto.currentPassword);
    if (!valid) throw new UnauthorizedException("Current password is invalid.");
    await this.prisma.authCredential.update({ where: { userId }, data: { passwordHash: await argon2.hash(dto.newPassword), passwordUpdatedAt: new Date() } });
    await this.logoutAll(userId);
    return { ok: true };
  }

  private async issueTokens(user: any, req: any, familyId = randomUUID()) {
    const refreshToken = randomBytes(48).toString("base64url");
    const csrfToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + Number(this.config.get("REFRESH_TOKEN_DAYS", 30)) * 24 * 60 * 60 * 1000);
    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        familyId,
        refreshTokenHash: await argon2.hash(refreshToken),
        expiresAt,
        ipAddress: req?.ip,
        userAgent: req?.headers?.["user-agent"]
      }
    });
    const roles = user.roles?.map((entry: any) => entry.role.code) ?? [];
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, username: user.username, roles, sessionId: session.id },
      { secret: this.config.get<string>("JWT_ACCESS_SECRET"), expiresIn: this.config.get<string>("JWT_ACCESS_EXPIRES_IN", "15m") }
    );
    return { accessToken, refreshToken, csrfToken, user: this.toAuthUser(user) };
  }

  private async ensureRole(code: string, name: string) {
    return this.prisma.role.upsert({ where: { code }, update: {}, create: { code, name } });
  }

  private async findMatchingSession(sessions: any[], token: string) {
    for (const session of sessions) {
      if (await argon2.verify(session.refreshTokenHash, token)) return session;
    }
    return null;
  }

  private toAuthUser(user: any) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      phone: user.phone ?? undefined,
      roles: user.roles?.map((entry: any) => entry.role.code) ?? []
    };
  }
}
