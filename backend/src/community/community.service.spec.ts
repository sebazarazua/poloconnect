import { CommunityService } from "./community.service";

const room = { id: "room-1", title: "Torneo La Plata", deletedAt: null };
const user = { id: "user-1", firstName: "Juan", lastName: "Pérez", avatarUrl: null };
const createdAt = new Date("2026-09-10T15:00:00.000Z");

function setup() {
  const message = {
    id: "message-1",
    roomId: room.id,
    userId: user.id,
    messageNumber: BigInt(8),
    body: "¿A qué hora comienza?",
    bodySanitized: "¿A qué hora comienza?",
    status: "sent",
    createdAt,
    editedAt: null,
    deletedAt: null,
    user
  };
  const transaction = {
    chatMessage: {
      findFirst: jest.fn(async () => ({ messageNumber: BigInt(7) })),
      create: jest.fn(async () => message)
    }
  };
  const prisma: any = {
    communityBan: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    chatMembership: {
      findFirst: jest.fn(async () => ({ roomId: room.id, userId: user.id })),
      updateMany: jest.fn(async () => ({ count: 1 }))
    },
    chatRoom: { findFirst: jest.fn(async () => room) },
    chatMessage: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction))
  };
  const notifications = { notifyRoomMembers: jest.fn(async () => []) };
  const gateway = { emitMessage: jest.fn(async () => undefined) };
  const moderation = { filterBlockedUserIds: jest.fn(async () => new Set<string>()) };
  const contentFilter = { assertAllowed: jest.fn() };
  const service = new CommunityService(prisma, notifications as any, gateway as any, moderation as any, contentFilter as any);

  return { service, prisma, transaction, notifications, gateway, message };
}

describe("CommunityService chat flow", () => {
  it("emits realtime data and formats the push with room, sender and message", async () => {
    const harness = setup();

    const result = await harness.service.sendMessage(user.id, room.id, "¿A qué hora comienza?", "local-123");

    expect(result).toEqual(expect.objectContaining({ id: "message-1", clientMessageId: "local-123", messageNumber: "8" }));
    expect(harness.gateway.emitMessage).toHaveBeenCalledWith(room.id, expect.objectContaining({
      id: "message-1",
      clientMessageId: "local-123",
      messageNumber: "8"
    }));
    expect(harness.notifications.notifyRoomMembers).toHaveBeenCalledWith(room.id, user.id, {
      kind: "message",
      title: "Torneo La Plata",
      body: "Juan Pérez: ¿A qué hora comienza?",
      data: { roomId: room.id, messageId: "message-1", clientMessageId: "local-123" }
    });
  });

  it("retries a serialization race before assigning the room sequence number", async () => {
    const harness = setup();
    harness.prisma.$transaction.mockRejectedValueOnce({ code: "P2034" });

    await expect(harness.service.sendMessage(user.id, room.id, "Mensaje", "local-race")).resolves.toEqual(
      expect.objectContaining({ id: "message-1", messageNumber: "8" })
    );
    expect(harness.prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(harness.gateway.emitMessage).toHaveBeenCalledTimes(1);
  });

  it("persists the per-room notification preference only for an active member", async () => {
    const harness = setup();

    await expect(harness.service.updateRoomNotifications(user.id, room.id, true)).resolves.toEqual({
      ok: true,
      notificationsMuted: true
    });
    expect(harness.prisma.chatMembership.updateMany).toHaveBeenCalledWith({
      where: { roomId: room.id, userId: user.id, leftAt: null },
      data: { notificationsMuted: true }
    });
  });

  it("returns messages after a sequence number in server order", async () => {
    const harness = setup();
    harness.prisma.chatMessage.findMany.mockResolvedValue([
      harness.message,
      { ...harness.message, id: "message-2", messageNumber: BigInt(9) }
    ]);

    const result = await harness.service.listMessages(user.id, room.id, { limit: 1, after: "7" });

    expect(harness.prisma.chatMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ messageNumber: { gt: BigInt(7) } }),
      orderBy: { messageNumber: "asc" },
      take: 2
    }));
    expect(result.data.map((entry) => entry.messageNumber)).toEqual(["8"]);
    expect(result.page).toEqual({ limit: 1, nextCursor: "8", hasMore: true });
  });
});
