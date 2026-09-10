import { CommunityGateway } from "./community.gateway";

describe("CommunityGateway room visibility", () => {
  function setup() {
    const gateway = new CommunityGateway({} as any, {} as any, {} as any);
    const client: any = {
      data: { userId: "viewer-1" },
      rooms: new Set(["chat:room:room-1"]),
      join: jest.fn(),
      leave: jest.fn()
    };
    jest.spyOn(gateway as any, "authenticate").mockResolvedValue("viewer-1");
    jest.spyOn(gateway as any, "canJoinRoom").mockResolvedValue(true);
    return { gateway, client };
  }

  it("tracks a visible room only for an active room member and clears it when leaving", async () => {
    const { gateway, client } = setup();

    await expect(gateway.setRoomVisibility(client, { roomId: "room-1", visible: true })).resolves.toEqual({ roomId: "room-1", ok: true });
    expect(client.data.visibleRoomId).toBe("room-1");

    gateway.leave(client, { roomId: "room-1" });
    expect(client.data.visibleRoomId).toBeUndefined();
  });

  it("returns only the users viewing the requested room", async () => {
    const { gateway } = setup();
    (gateway as any).server = {
      in: jest.fn(() => ({
        fetchSockets: jest.fn(async () => [
          { data: { userId: "viewer-1", visibleRoomId: "room-1" } },
          { data: { userId: "viewer-2", visibleRoomId: "room-2" } },
          { data: { userId: "viewer-3", visibleRoomId: "room-1" } }
        ])
      }))
    };

    await expect(gateway.getActiveRoomViewerUserIds("room-1")).resolves.toEqual(new Set(["viewer-1", "viewer-3"]));
  });
});
