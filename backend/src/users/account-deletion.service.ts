import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { importPKCS8, SignJWT } from "jose";
import { PrismaService } from "../database/prisma.service";
import { MediaService } from "../common/media/media.service";

type OwnedMediaReferences = {
  storageKeys: string[];
  legacyUploadPaths: string[];
};

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly config: ConfigService
  ) {}

  async deleteOwnAccount(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        authIdentities: true,
        products: { include: { images: true } }
      }
    });

    if (!user) {
      throw new UnauthorizedException("Account is no longer available.");
    }

    const mediaReferences = this.collectOwnedMediaReferences(user);
    const appleRevocation = await this.revokeAppleAuthorizations(user.authIdentities);

    const deleted = await this.prisma.$transaction(async (tx) => {
      const messageIds = await tx.chatMessage.findMany({
        where: { userId },
        select: { id: true }
      });
      const userRegistrationPlayers = await tx.tournamentRegistrationPlayer.findMany({
        where: { registration: { captainUserId: userId } },
        select: { playerId: true }
      });
      const profilePlayers = await tx.player.findMany({
        where: { userId },
        select: { id: true }
      });
      const playerIds = Array.from(new Set([
        ...userRegistrationPlayers.map((entry) => entry.playerId),
        ...profilePlayers.map((entry) => entry.id)
      ]));

      if (messageIds.length > 0) {
        await tx.chatMembership.updateMany({
          where: { lastReadMessageId: { in: messageIds.map((message) => message.id) } },
          data: { lastReadMessageId: null, lastReadAt: null }
        });
      }

      await tx.sellerContact.deleteMany({
        where: { OR: [{ buyerId: userId }, { sellerId: userId }] }
      });

      await tx.product.deleteMany({ where: { sellerId: userId } });
      await tx.tournamentRegistration.deleteMany({ where: { captainUserId: userId } });

      if (playerIds.length > 0) {
        await tx.player.deleteMany({
          where: {
            id: { in: playerIds },
            lineups: { none: {} },
            registrations: { none: {} }
          }
        });

        await tx.player.updateMany({
          where: {
            id: { in: playerIds },
            lineups: { some: {} },
            registrations: { none: {} }
          },
          data: {
            userId: null,
            displayName: "Usuario eliminado",
            avatarUrl: null
          }
        });

        await tx.player.updateMany({
          where: { userId },
          data: {
            userId: null,
            displayName: "Usuario eliminado",
            avatarUrl: null
          }
        });
      }

      await tx.communityModerationAction.updateMany({
        where: { actorUserId: userId },
        data: { actorUserId: null }
      });
      await tx.communityModerationAction.deleteMany({ where: { targetUserId: userId } });
      await tx.communityBan.updateMany({ where: { createdBy: userId }, data: { createdBy: null } });
      await tx.communityBan.updateMany({ where: { revokedBy: userId }, data: { revokedBy: null } });

      await tx.tournament.updateMany({ where: { createdBy: userId }, data: { createdBy: null } });
      await tx.spotlightEvent.updateMany({ where: { createdBy: userId }, data: { createdBy: null } });
      await tx.matchEvent.updateMany({ where: { createdBy: userId }, data: { createdBy: null } });
      await tx.appContentItem.updateMany({ where: { createdBy: userId }, data: { createdBy: null } });
      await tx.appContentItem.updateMany({ where: { updatedBy: userId }, data: { updatedBy: null } });
      await tx.auditLog.updateMany({
        where: { actorUserId: userId },
        data: { actorUserId: null }
      });
      await tx.auditLog.updateMany({
        where: { resourceType: "User", resourceId: userId },
        data: { resourceId: null }
      });

      await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });

      const result = await tx.user.deleteMany({ where: { id: userId } });
      return result.count > 0;
    });

    if (deleted) {
      await this.deleteOwnedMedia(mediaReferences);
    }

    return {
      ok: true,
      deleted,
      appleAuthorizationRevoked: appleRevocation.revoked,
      appleAuthorizationConfigured: appleRevocation.configured
    };
  }

  private collectOwnedMediaReferences(user: Prisma.UserGetPayload<{ include: { authIdentities: true; products: { include: { images: true } } } }>): OwnedMediaReferences {
    const urls = [
      user.avatarUrl,
      ...user.products.flatMap((product) => product.images.map((image) => image.url))
    ];
    const explicitKeys = user.products.flatMap((product) => product.images.map((image) => image.storageKey).filter((key): key is string => Boolean(key)));
    const storageKeys = new Set<string>(explicitKeys);
    const legacyUploadPaths = new Set<string>();

    for (const url of urls) {
      const storageKey = this.media.extractStorageKeyFromUrl(url);
      if (storageKey) {
        storageKeys.add(storageKey);
      }

      const legacyPath = this.media.extractLegacyUploadPath(url);
      if (legacyPath) {
        legacyUploadPaths.add(legacyPath);
      }
    }

    return {
      storageKeys: Array.from(storageKeys),
      legacyUploadPaths: Array.from(legacyUploadPaths)
    };
  }

  private async deleteOwnedMedia(references: OwnedMediaReferences) {
    const [remoteResult, localResult] = await Promise.allSettled([
      this.media.deleteStorageKeys(references.storageKeys),
      this.media.deleteLegacyUploadPaths(references.legacyUploadPaths)
    ]);

    if (remoteResult.status === "rejected") {
      this.logger.warn(`Account media cleanup failed for remote files: ${remoteResult.reason}`);
    }

    if (localResult.status === "rejected") {
      this.logger.warn(`Account media cleanup failed for local files: ${localResult.reason}`);
    }
  }

  private async revokeAppleAuthorizations(authIdentities: Array<{ provider: string; providerRefreshToken: string | null }>) {
    const appleIdentities = authIdentities.filter((identity) => identity.provider === "apple" && identity.providerRefreshToken);
    const configured = this.hasAppleRevocationConfig();

    if (appleIdentities.length === 0) {
      return { configured, revoked: false };
    }

    if (!configured) {
      this.logger.warn("Apple account deletion revocation skipped because Apple OAuth revocation credentials are not configured.");
      return { configured: false, revoked: false };
    }

    let revoked = false;
    for (const identity of appleIdentities) {
      try {
        await this.revokeAppleToken(identity.providerRefreshToken!);
        revoked = true;
      } catch (error) {
        this.logger.warn(`Apple authorization revocation failed during account deletion: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { configured: true, revoked };
  }

  private hasAppleRevocationConfig() {
    return Boolean(
      this.config.get<string>("APPLE_TEAM_ID")?.trim() &&
        this.config.get<string>("APPLE_KEY_ID")?.trim() &&
        this.config.get<string>("APPLE_PRIVATE_KEY")?.trim() &&
        this.resolveAppleClientId()
    );
  }

  private async revokeAppleToken(token: string) {
    const clientId = this.resolveAppleClientId();
    if (!clientId) {
      throw new Error("Missing Apple client id.");
    }

    const clientSecret = await this.createAppleClientSecret(clientId);
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: "refresh_token"
    });

    const response = await fetch("https://appleid.apple.com/auth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!response.ok) {
      throw new Error(`Apple revoke returned ${response.status}.`);
    }
  }

  private async createAppleClientSecret(clientId: string) {
    const teamId = this.config.get<string>("APPLE_TEAM_ID")?.trim();
    const keyId = this.config.get<string>("APPLE_KEY_ID")?.trim();
    const rawPrivateKey = this.config.get<string>("APPLE_PRIVATE_KEY")?.trim();

    if (!teamId || !keyId || !rawPrivateKey) {
      throw new Error("Missing Apple client secret configuration.");
    }

    const privateKey = await importPKCS8(rawPrivateKey.replace(/\\n/g, "\n"), "ES256");
    return new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: keyId })
      .setIssuer(teamId)
      .setSubject(clientId)
      .setAudience("https://appleid.apple.com")
      .setIssuedAt()
      .setExpirationTime("180d")
      .sign(privateKey);
  }

  private resolveAppleClientId() {
    return (
      this.config.get<string>("APPLE_OAUTH_CLIENT_ID")?.trim() ||
      this.config.get<string>("APPLE_OAUTH_CLIENT_IDS")
        ?.split(",")
        .map((value) => value.trim())
        .find(Boolean) ||
      null
    );
  }
}
