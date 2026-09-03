import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createTransport, type Transporter } from "nodemailer";
import { randomBytes, randomInt, randomUUID } from "crypto";
import { PrismaService } from "../database/prisma.service";
import {
  AppleLoginDto,
  ChangePasswordDto,
  GoogleLoginDto,
  LoginDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
  RegisterDto
} from "./dto/auth.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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

  async loginWithGoogle(dto: GoogleLoginDto, req: any) {
    const profile = await this.fetchGoogleProfile(dto.accessToken);
    const user = await this.findOrCreateSocialUser("google", profile.sub, {
      email: profile.email,
      emailVerified: profile.emailVerified,
      firstName: profile.firstName,
      lastName: profile.lastName
    });

    return this.issueTokens(user, req);
  }

  async loginWithApple(dto: AppleLoginDto, req: any) {
    const profile = await this.verifyAppleIdentityToken(dto.identityToken);
    const user = await this.findOrCreateSocialUser("apple", profile.sub, {
      email: profile.email,
      emailVerified: profile.emailVerified,
      firstName: dto.firstName ?? profile.firstName,
      lastName: dto.lastName ?? profile.lastName
    });

    return this.issueTokens(user, req);
  }

  async requestPasswordReset(dto: PasswordResetRequestDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { credential: true }
    });

    if (!user?.credential) {
      return { ok: true };
    }

    const resetCode = String(randomInt(100000, 1000000));
    await this.prisma.passwordResetCode.deleteMany({ where: { userId: user.id } });
    await this.prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        email,
        codeHash: await argon2.hash(resetCode),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    try {
      await this.sendPasswordResetEmail(email, resetCode, user.firstName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Password reset email send failed for ${email}: ${errorMessage}`);
    }
    return { ok: true };
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto, req: any) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { credential: true, roles: { include: { role: true } } }
    });

    if (!user?.credential) {
      throw new BadRequestException("Invalid reset code.");
    }

    const resetRecord = await this.prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        email,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!resetRecord) {
      throw new BadRequestException("Invalid or expired reset code.");
    }

    const isValid = await argon2.verify(resetRecord.codeHash, dto.code.trim());
    if (!isValid) {
      const nextAttemptCount = resetRecord.attemptCount + 1;
      await this.prisma.passwordResetCode.update({
        where: { id: resetRecord.id },
        data: { attemptCount: nextAttemptCount }
      });

      if (nextAttemptCount >= 5) {
        await this.prisma.passwordResetCode.deleteMany({ where: { userId: user.id } });
      }

      throw new BadRequestException("Invalid or expired reset code.");
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.authCredential.upsert({
        where: { userId: user.id },
        update: {
          passwordHash,
          passwordUpdatedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null
        },
        create: {
          userId: user.id,
          passwordHash,
          passwordUpdatedAt: new Date()
        }
      });

      await transaction.passwordResetCode.update({
        where: { id: resetRecord.id },
        data: { consumedAt: new Date() }
      });

      await transaction.passwordResetCode.deleteMany({
        where: { userId: user.id, id: { not: resetRecord.id } }
      });
    });

    await this.logoutAll(user.id);
    return this.issueTokens(user, req);
  }

  async refresh(refreshToken: string, req: any) {
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

  private async findOrCreateSocialUser(
    provider: string,
    providerSubject: string,
    profile: {
      email?: string | null;
      emailVerified?: boolean;
      firstName?: string | null;
      lastName?: string | null;
    }
  ) {
    const normalizedEmail = profile.email?.trim().toLowerCase() || null;
    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider,
          providerSubject
        }
      },
      include: {
        user: {
          include: { roles: { include: { role: true } }, credential: true }
        }
      }
    });

    if (existingIdentity?.user) {
      if (normalizedEmail && existingIdentity.user.email !== normalizedEmail) {
        await this.prisma.user.update({
          where: { id: existingIdentity.user.id },
          data: {
            email: normalizedEmail,
            emailVerifiedAt: profile.emailVerified ? new Date() : existingIdentity.user.emailVerifiedAt
          }
        });
        existingIdentity.user.email = normalizedEmail;
      }

      return existingIdentity.user;
    }

    let user = normalizedEmail
      ? await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { roles: { include: { role: true } }, credential: true }
        })
      : null;

    if (!user) {
      const playerRole = await this.ensureRole("player", "Player");
      const usernameSeed = this.createUsernameSeed(normalizedEmail ?? `${provider}-${providerSubject}`);
      const username = await this.createUniqueUsername(usernameSeed);
      const passwordHash = await argon2.hash(randomBytes(32).toString("hex"));

      user = await this.prisma.user.create({
        data: {
          firstName: (profile.firstName?.trim() || "Usuario").slice(0, 100),
          lastName: (profile.lastName?.trim() || this.defaultLastName(provider)).slice(0, 100),
          email: normalizedEmail ?? `${provider}-${providerSubject}@polo-connect.local`,
          username,
          phone: null,
          emailVerifiedAt: profile.emailVerified ? new Date() : null,
          credential: { create: { passwordHash } },
          settings: { create: {} },
          roles: { create: { roleId: playerRole.id } }
        },
        include: { roles: { include: { role: true } }, credential: true }
      });
    } else if (!user.credential) {
      const passwordHash = await argon2.hash(randomBytes(32).toString("hex"));
      await this.prisma.authCredential.upsert({
        where: { userId: user.id },
        update: { passwordHash, passwordUpdatedAt: new Date() },
        create: { userId: user.id, passwordHash, passwordUpdatedAt: new Date() }
      });
    }

    await this.prisma.authIdentity.upsert({
      where: {
        provider_providerSubject: {
          provider,
          providerSubject
        }
      },
      update: {
        email: normalizedEmail
      },
      create: {
        provider,
        providerSubject,
        email: normalizedEmail,
        userId: user.id
      }
    });

    if (normalizedEmail && profile.emailVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() }
      });
    }

    return this.prisma.user.findUnique({
      where: { id: user.id },
      include: { roles: { include: { role: true } }, credential: true }
    });
  }

  private async createUniqueUsername(seed: string) {
    let candidate = seed;
    let suffix = 1;

    while (await this.prisma.user.findUnique({ where: { username: candidate } })) {
      candidate = `${seed}${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private createUsernameSeed(value: string) {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 20);

    return normalized || "user";
  }

  private defaultLastName(provider: string) {
    return provider === "apple" ? "Apple" : "Social";
  }

  private async fetchGoogleProfile(accessToken: string) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new UnauthorizedException("Google sign-in failed.");
    }

    const payload = (await response.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      name?: string;
    };

    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException("Google account did not return an email.");
    }

    const derivedNames = this.splitDisplayName(payload.name);
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: Boolean(payload.email_verified),
      firstName: payload.given_name ?? derivedNames.firstName,
      lastName: payload.family_name ?? derivedNames.lastName
    };
  }

  private async verifyAppleIdentityToken(identityToken: string) {
    const audienceValues = this.resolveAppleAudiences();
    if (audienceValues.length === 0) {
      throw new BadRequestException("Apple OAuth is not configured.");
    }

    const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
    const { payload } = await jwtVerify(identityToken, appleJwks, {
      issuer: "https://appleid.apple.com",
      audience: audienceValues.length === 1 ? audienceValues[0] : audienceValues
    });
    const applePayload = payload as {
      sub?: string;
      email?: string;
      email_verified?: boolean | "true" | "false";
      given_name?: string;
      family_name?: string;
    };

    if (!applePayload.sub) {
      throw new UnauthorizedException("Apple sign-in failed.");
    }

    return {
      sub: applePayload.sub,
      email: applePayload.email,
      emailVerified: applePayload.email_verified === true || applePayload.email_verified === "true",
      firstName: applePayload.given_name,
      lastName: applePayload.family_name
    };
  }

  private splitDisplayName(name?: string) {
    if (!name) {
      return { firstName: undefined, lastName: undefined };
    }

    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: undefined };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" ")
    };
  }

  private resolveAppleAudiences() {
    const multiAudienceRaw = this.config.get<string>("APPLE_OAUTH_CLIENT_IDS");
    const singleAudienceRaw = this.config.get<string>("APPLE_OAUTH_CLIENT_ID");
    const rawValues = [multiAudienceRaw, singleAudienceRaw]
      .filter(Boolean)
      .join(",")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return Array.from(new Set(rawValues));
  }

  private async sendPasswordResetEmail(email: string, code: string, firstName: string) {
    const transporter = this.createMailTransport();
    const subject = "Polo Connect - código para recuperar tu contraseña";
    const greeting = firstName?.trim() ? `Hola, ${firstName.trim()}` : "Hola";
    const text = `${greeting}\n\nTu código para recuperar la contraseña es: ${code}\n\nEl código vence en 15 minutos. Si no lo pediste, podés ignorar este correo.`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0b1325">
        <p>${greeting}</p>
        <p>Tu código para recuperar la contraseña es:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${code}</p>
        <p>El código vence en 15 minutos. Si no lo pediste, podés ignorar este correo.</p>
      </div>
    `;

    if (!transporter) {
      if (process.env.NODE_ENV === "production") {
        this.logger.warn("Password reset email requested but no mail provider is configured.");
      } else {
        this.logger.warn(`Password reset code for ${email}: ${code}`);
      }
      return;
    }

    await transporter.sendMail({
      from:
        this.config.get<string>("SMTP_FROM") ??
        this.config.get<string>("RESEND_FROM") ??
        this.config.get<string>("SMTP_USER") ??
        "no-reply@polo-connect.local",
      to: email,
      subject,
      text,
      html
    });
  }

  private createMailTransport(): Transporter | null {
    const host = this.config.get<string>("SMTP_HOST");
    if (host) {
      return createTransport({
        host,
        port: Number(this.config.get<string>("SMTP_PORT") ?? 587),
        secure: this.config.get<string>("SMTP_SECURE") === "true",
        auth: this.config.get<string>("SMTP_USER")
          ? {
              user: this.config.get<string>("SMTP_USER")!,
              pass: this.config.get<string>("SMTP_PASS") ?? ""
            }
          : undefined
      });
    }

    const resendApiKey = this.config.get<string>("RESEND_API_KEY");
    if (resendApiKey) {
      return createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: {
          user: "resend",
          pass: resendApiKey
        }
      });
    }

    return null;
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
      avatarUrl: user.avatarUrl ?? undefined,
      roles: user.roles?.map((entry: any) => entry.role.code) ?? []
    };
  }
}
