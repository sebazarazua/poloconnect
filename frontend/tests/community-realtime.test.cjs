const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function loadCommunityApi(socket, requests = []) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path.join(root, "services/api/community.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  vm.runInNewContext(source, {
    exports,
    URLSearchParams,
    require(id) {
      if (id === "socket.io-client") return { io: () => socket };
      if (id === "@/services/api/client") {
        return {
          getAccessToken: () => "access-token",
          getSocketUrl: () => "https://api.example/ws",
          apiRequest: async (route, init) => {
            requests.push({ route, init });
            return { id: "message-1" };
          }
        };
      }
      throw new Error(`Unexpected dependency: ${id}`);
    }
  }, { filename: "services/api/community.ts" });

  return exports;
}

function socketHarness() {
  const handlers = new Map();
  const emissions = [];
  const socket = {
    connected: true,
    auth: {},
    io: { on() {} },
    on(event, handler) { handlers.set(event, handler); },
    off(event, handler) { if (handlers.get(event) === handler) handlers.delete(event); },
    emit(event, payload, ack) {
      emissions.push({ event, payload });
      if (event === "join_room" && ack) ack({ roomId: payload.roomId, ok: true });
    },
    connect() { socket.connected = true; handlers.get("connect")?.(); },
    disconnect() { socket.connected = false; }
  };
  return { socket, handlers, emissions };
}

test("room subscription rejoins after reconnect and cleans up its listeners", () => {
  const harness = socketHarness();
  const api = loadCommunityApi(harness.socket);
  const received = [];
  let joined = 0;

  const unsubscribe = api.subscribeToRoomMessages("room-1", (message) => received.push(message), () => { joined += 1; });
  assert.equal(joined, 1);
  assert.equal(harness.emissions.filter((entry) => entry.event === "join_room").length, 1);

  harness.handlers.get("message_received")({ roomId: "other-room", message: { id: "ignored" } });
  harness.handlers.get("message_received")({ roomId: "room-1", message: { id: "message-1" } });
  assert.deepEqual(received, [{ id: "message-1" }]);

  harness.socket.connected = false;
  harness.socket.connect();
  assert.equal(joined, 2);
  assert.equal(harness.emissions.filter((entry) => entry.event === "join_room").length, 2);

  unsubscribe();
  assert.equal(harness.handlers.has("message_received"), false);
  assert.equal(harness.handlers.has("connect"), false);
  assert.equal(harness.emissions.at(-1).event, "leave_room");
});

test("sending uses the optimistic message id as the server correlation id", async () => {
  const harness = socketHarness();
  const requests = [];
  const api = loadCommunityApi(harness.socket, requests);

  await api.sendMessage("room-1", "Hola", "local-123");

  assert.equal(requests.length, 1);
  assert.equal(requests[0].route, "/chat-rooms/room-1/messages");
  assert.equal(requests[0].init.method, "POST");
  assert.deepEqual(JSON.parse(requests[0].init.body), { text: "Hola", clientMessageId: "local-123" });
});
