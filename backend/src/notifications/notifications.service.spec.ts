import { NotificationsService } from "./notifications.service";

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
