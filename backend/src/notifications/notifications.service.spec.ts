import { NotificationsService } from "./notifications.service";

describe("NotificationsService platform push delivery", () => {
  it("sends Android on its configured channel and preserves the existing iOS payload", async () => {
    const prisma: any = {
      pushToken: {
        findMany: jest.fn(async () => [
          { platform: "android", token: "ExponentPushToken[android]" },
          { platform: "ios", token: "ExponentPushToken[ios]" }
        ])
      }
    };
    const service = new NotificationsService(prisma, {} as any);
    const send = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    } as Response);
    try {
      await (service as any).sendPushToUserTokens("user-1", "Comunidad", "Mensaje", { roomId: "room-1" });
      const messages = JSON.parse(String(send.mock.calls[0][1]?.body));
      expect(messages[0].channelId).toBe("default");
      expect(messages[1]).toEqual({
        to: "ExponentPushToken[ios]",
        sound: "default",
        title: "Comunidad",
        body: "Mensaje",
        data: { roomId: "room-1" }
      });
    } finally {
      send.mockRestore();
    }
  });

  it("stores and reassigns Expo tokens with their Android platform", async () => {
    const prisma: any = { pushToken: { upsert: jest.fn(async () => ({})) } };
    const service = new NotificationsService(prisma, {} as any);
    await service.savePushToken("user-1", { token: "ExponentPushToken[android]", platform: "android" });
    expect(prisma.pushToken.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { token: "ExponentPushToken[android]" },
      update: expect.objectContaining({ userId: "user-1", platform: "android", enabled: true }),
      create: expect.objectContaining({ userId: "user-1", platform: "android" })
    }));
  });
});

describe("NotificationsService room delivery", () => {
  it("selects active memberships other than the sender together with their mute state", async () => {
    const prisma: any = {
      chatMembership: { findMany: jest.fn(async () => []) },
      userBlock: { findMany: jest.fn(async () => []) }
    };
    const settings = { getMe: jest.fn() };
    const service = new NotificationsService(prisma, settings as any);

    await service.notifyRoomMembers("room-1", "sender-1", {
      kind: "message",
      title: "Comunidad",
      body: "Usuario: Mensaje"
    });

    expect(prisma.chatMembership.findMany).toHaveBeenCalledWith({
      where: {
        roomId: "room-1",
        leftAt: null,
        userId: { not: "sender-1" }
      },
      select: { userId: true, notificationsMuted: true }
    });
    expect(settings.getMe).not.toHaveBeenCalled();
  });

  it("keeps the existing global message preference as the push gate", async () => {
    const prisma: any = {
      chatMembership: { findMany: jest.fn(async () => [{ userId: "recipient-1" }]) },
      userBlock: { findMany: jest.fn(async () => []) },
      $transaction: jest.fn()
    };
    const settings = {
      getMe: jest.fn(async () => ({
        pushEnabled: false,
        notificationPreferences: {
          app: { messages: false, matches: true, tournaments: true, market: true, system: true, community: true },
          push: { messages: false, matches: true, tournaments: true }
        }
      }))
    };
    const service = new NotificationsService(prisma, settings as any);

    await service.notifyRoomMembers("room-1", "sender-1", {
      kind: "message",
      title: "Comunidad",
      body: "Usuario: Mensaje"
    });

    expect(settings.getMe).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not create an in-app notification or queue a push for an active room viewer", async () => {
    const prisma: any = {
      chatMembership: { findMany: jest.fn(async () => [{ userId: "viewer-1", notificationsMuted: false }]) },
      userBlock: { findMany: jest.fn(async () => []) },
      $transaction: jest.fn()
    };
    const settings = { getMe: jest.fn() };
    const service = new NotificationsService(prisma, settings as any);

    await service.notifyRoomMembers("room-1", "sender-1", {
      kind: "message",
      title: "Comunidad",
      body: "Usuario: Mensaje"
    }, { skipNotificationUserIds: new Set(["viewer-1"]) });

    expect(settings.getMe).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("uses one settings read and queues push immediately for an enabled recipient", async () => {
    const notification = {
      id: "notification-1",
      userId: "recipient-1",
      kind: "message",
      title: "Comunidad",
      body: "Usuario: Mensaje",
      data: { roomId: "room-1" },
      readAt: null,
      createdAt: new Date("2026-09-10T15:00:00.000Z"),
      expiresAt: null
    };
    const prisma: any = {
      chatMembership: { findMany: jest.fn(async () => [{ userId: "recipient-1" }]) },
      userBlock: { findMany: jest.fn(async () => []) },
      notification: { create: jest.fn(async () => notification) },
      $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations))
    };
    const settings = {
      getMe: jest.fn(async () => ({
        pushEnabled: true,
        notificationPreferences: {
          app: { messages: true, matches: true, tournaments: true, market: true, system: true, community: true },
          push: { messages: true, matches: true, tournaments: true }
        }
      }))
    };
    const service = new NotificationsService(prisma, settings as any);
    const sendPush = jest.spyOn(service as any, "sendPushToUserTokens").mockResolvedValue(1);

    await service.notifyRoomMembers("room-1", "sender-1", {
      kind: "message",
      title: "Comunidad",
      body: "Usuario: Mensaje",
      data: { roomId: "room-1" }
    });

    expect(settings.getMe).toHaveBeenCalledTimes(1);
    expect(sendPush).toHaveBeenCalledWith(
      "recipient-1",
      "Comunidad",
      "Usuario: Mensaje",
      { roomId: "room-1", kind: "message" }
    );
  });

  it("keeps the in-app notification but skips push for a muted room", async () => {
    const notification = {
      id: "notification-1",
      userId: "recipient-1",
      kind: "message",
      title: "Comunidad",
      body: "Usuario: Mensaje",
      data: { roomId: "room-1" },
      readAt: null,
      createdAt: new Date("2026-09-10T15:00:00.000Z"),
      expiresAt: null
    };
    const prisma: any = {
      chatMembership: { findMany: jest.fn(async () => [{ userId: "recipient-1", notificationsMuted: true }]) },
      userBlock: { findMany: jest.fn(async () => []) },
      notification: { create: jest.fn(async () => notification) },
      $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations))
    };
    const settings = {
      getMe: jest.fn(async () => ({
        pushEnabled: true,
        notificationPreferences: {
          app: { messages: true, matches: true, tournaments: true, market: true, system: true, community: true },
          push: { messages: true, matches: true, tournaments: true }
        }
      }))
    };
    const service = new NotificationsService(prisma, settings as any);
    const sendPush = jest.spyOn(service as any, "sendPushToUserTokens").mockResolvedValue(1);

    await service.notifyRoomMembers("room-1", "sender-1", {
      kind: "message",
      title: "Comunidad",
      body: "Usuario: Mensaje",
      data: { roomId: "room-1" }
    });

    expect(prisma.notification.create).toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();
  });
});
