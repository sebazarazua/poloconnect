import { UnauthorizedException } from "@nestjs/common";

jest.mock("jose", () => ({
  importPKCS8: jest.fn(),
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuer: jest.fn().mockReturnThis(),
    setSubject: jest.fn().mockReturnThis(),
    setAudience: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("apple-client-secret")
  }))
}));

import { AccountDeletionService } from "./account-deletion.service";

function createTx() {
  return {
    chatMessage: { findMany: jest.fn().mockResolvedValue([{ id: "message-1" }]) },
    tournamentRegistrationPlayer: { findMany: jest.fn().mockResolvedValue([{ playerId: "player-registration-1" }]) },
    player: {
      findMany: jest.fn().mockResolvedValue([{ id: "player-profile-1" }]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 })
    },
    chatMembership: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    sellerContact: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
    product: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    tournamentRegistration: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    communityModerationAction: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 })
    },
    communityBan: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    tournament: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    spotlightEvent: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    matchEvent: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    appContentItem: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    auditLog: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    authSession: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    user: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) }
  };
}

function createService(user: any) {
  const tx = createTx();
  const prisma = {
    user: { findFirst: jest.fn().mockResolvedValue(user) },
    $transaction: jest.fn((callback: any) => callback(tx))
  };
  const media = {
    extractStorageKeyFromUrl: jest.fn((url?: string | null) => {
      if (!url) return null;
      return url.startsWith("/api/v1/media/") ? url.replace("/api/v1/media/", "") : null;
    }),
    extractLegacyUploadPath: jest.fn((url?: string | null) => {
      return url?.startsWith("/uploads/") ? url : null;
    }),
    deleteStorageKeys: jest.fn().mockResolvedValue({ deleted: 2, skipped: 0, failed: 0 }),
    deleteLegacyUploadPaths: jest.fn().mockResolvedValue({ deleted: 1, skipped: 0, failed: 0 })
  };
  const config = { get: jest.fn().mockReturnValue(undefined) };

  return {
    service: new AccountDeletionService(prisma as any, media as any, config as any),
    prisma,
    media,
    tx
  };
}

describe("AccountDeletionService", () => {
  it("deletes the authenticated user's owned data and anonymizes shared references", async () => {
    const user = {
      id: "user-1",
      avatarUrl: "/api/v1/media/avatars/avatar-1.jpg",
      authIdentities: [{ provider: "google", providerRefreshToken: null }],
      products: [
        {
          id: "product-1",
          images: [
            { url: "/api/v1/media/products/product-1.jpg", storageKey: "products/product-1.jpg" },
            { url: "/uploads/legacy-product.jpg", storageKey: null }
          ]
        }
      ]
    };
    const { service, prisma, media, tx } = createService(user);

    await expect(service.deleteOwnAccount("user-1")).resolves.toMatchObject({ ok: true, deleted: true });

    expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1", deletedAt: null } }));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.chatMembership.updateMany).toHaveBeenCalledWith({
      where: { lastReadMessageId: { in: ["message-1"] } },
      data: { lastReadMessageId: null, lastReadAt: null }
    });
    expect(tx.sellerContact.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ buyerId: "user-1" }, { sellerId: "user-1" }] }
    });
    expect(tx.product.deleteMany).toHaveBeenCalledWith({ where: { sellerId: "user-1" } });
    expect(tx.tournamentRegistration.deleteMany).toHaveBeenCalledWith({ where: { captainUserId: "user-1" } });
    expect(tx.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
    expect(tx.user.deleteMany).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(media.deleteStorageKeys).toHaveBeenCalledWith(expect.arrayContaining(["avatars/avatar-1.jpg", "products/product-1.jpg"]));
    expect(media.deleteLegacyUploadPaths).toHaveBeenCalledWith(["/uploads/legacy-product.jpg"]);
  });

  it("rejects deletion if the account is already unavailable", async () => {
    const { service, prisma, media } = createService(null);

    await expect(service.deleteOwnAccount("missing-user")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(media.deleteStorageKeys).not.toHaveBeenCalled();
  });
});
