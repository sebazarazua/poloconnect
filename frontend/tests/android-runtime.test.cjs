const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const tick = () => new Promise((resolve) => setImmediate(resolve));

function loadService(file, dependencies, extras = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    console: { warn() {}, info() {} },
    process: { env: { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "web-client" } },
    require(id) {
      if (!(id in dependencies)) throw new Error(`Unexpected native import: ${id}`);
      return dependencies[id];
    },
    ...extras
  });
  return exports;
}

function pushHarness({ platform = "android", expoGo = false, granted = true, failAt, tokenDeferred } = {}) {
  const calls = [];
  const stored = new Map();
  const listeners = {};
  const notifications = {
    AndroidImportance: { MAX: 5 },
    setNotificationHandler: (handler) => { calls.push("handler"); listeners.foreground = handler; },
    setNotificationChannelAsync: async () => { calls.push("channel"); if (failAt === "channel") throw new Error("channel failure"); },
    getPermissionsAsync: async () => { calls.push("permissions"); if (failAt === "permissions") throw new Error("permissions failure"); return { granted: false }; },
    requestPermissionsAsync: async () => { calls.push("request-permissions"); return { granted }; },
    getExpoPushTokenAsync: async (options) => {
      calls.push(["expo-token", options]);
      if (failAt === "expo-token") throw new Error("FCM failure");
      return tokenDeferred || { data: "ExponentPushToken[test]" };
    },
    addPushTokenListener: (callback) => { listeners.token = callback; return { remove: () => { delete listeners.token; } }; },
    addNotificationResponseReceivedListener: (callback) => { listeners.response = callback; return { remove: () => { delete listeners.response; } }; },
    getLastNotificationResponseAsync: async () => listeners.lastResponse || null
  };
  const dependencies = {
    "expo-constants": { __esModule: true, default: { executionEnvironment: expoGo ? "storeClient" : "standalone", expoConfig: { extra: { eas: { projectId: "project-id" } } } } },
    "expo-device": { isDevice: true },
    "react-native": {
      Platform: { OS: platform },
      AppState: { addEventListener: (_, callback) => { listeners.state = callback; return { remove: () => { delete listeners.state; } }; } }
    },
    "@/services/auth-storage": {
      getAuthStorageItem: async (key) => stored.get(key),
      setAuthStorageItem: async (key, value) => { calls.push(["storage", value]); stored.set(key, value); }
    },
    "@/services/api/notifications": {
      savePushToken: async (body) => { calls.push(["save", body]); if (failAt === "backend") throw new Error("API offline"); },
      unregisterPushToken: async (token) => calls.push(["unregister", token])
    }
  };
  if (!expoGo && platform !== "web") dependencies["expo-notifications"] = notifications;
  return { service: loadService("services/push-notifications.ts", dependencies), calls, stored, listeners };
}

test("Android Expo Go skips all native notification imports, including navigation and logout", async () => {
  const h = pushHarness({ expoGo: true });
  assert.equal(await h.service.registerDevicePushToken(), null);
  (await h.service.registerNotificationResponseHandler(() => assert.fail("navigation")))();
  h.service.startAndroidPushTokenRegistration()();
  await h.service.unregisterCurrentDevicePushToken();
  assert.equal(h.calls.length, 0);
});

test("Android build creates channel before permission and persists an Expo token with android platform", async () => {
  const h = pushHarness();
  assert.equal(await h.service.registerDevicePushToken(), "ExponentPushToken[test]");
  assert.ok(h.calls.indexOf("channel") < h.calls.indexOf("request-permissions"));
  assert.equal(h.calls.find((call) => call[0] === "save")[1].platform, "android");
  assert.equal(h.stored.get("pc_expo_push_token"), "ExponentPushToken[test]");
  await h.service.unregisterCurrentDevicePushToken();
  assert.equal(h.stored.get("pc_expo_push_token"), null);
  assert.ok(h.calls.some((call) => call[0] === "unregister"));
});

test("denied Android permission never registers a token", async () => {
  const h = pushHarness({ granted: false });
  assert.equal(await h.service.registerDevicePushToken(), null);
  assert.ok(!h.calls.some((call) => call[0] === "expo-token"));
});

for (const failAt of ["channel", "permissions", "expo-token", "backend"]) {
  test(`push ${failAt} failure does not reject startup or persist a failed registration`, async () => {
    const h = pushHarness({ failAt });
    assert.equal(await h.service.registerDevicePushToken(), null);
    assert.equal(h.stored.size, 0);
  });
}

test("Android retries on foreground, converts rotated FCM token without recursive token acquisition, cleans up", async () => {
  const h = pushHarness();
  const cleanup = h.service.startAndroidPushTokenRegistration();
  await tick();
  h.listeners.state("active");
  await tick();
  const token = { type: "android", data: "native-fcm-token" };
  h.listeners.token(token);
  await tick();
  const requests = h.calls.filter((call) => call[0] === "expo-token");
  assert.equal(requests.length, 3);
  assert.equal(requests[2][1].devicePushToken, token);
  cleanup();
  assert.equal(h.listeners.token, undefined);
  assert.equal(h.listeners.state, undefined);
});

test("logout cancels a pending Android token acquisition before it can register the logged-out user", async () => {
  let resolveToken;
  const tokenDeferred = new Promise((resolve) => { resolveToken = resolve; });
  const h = pushHarness({ tokenDeferred });
  h.service.startAndroidPushTokenRegistration();
  await tick();
  const logout = h.service.unregisterCurrentDevicePushToken();
  resolveToken({ data: "ExponentPushToken[late]" });
  await logout;
  assert.ok(!h.calls.some((call) => call[0] === "save"));
});

test("iOS retains foreground notification behavior and token platform without Android channels", async () => {
  const h = pushHarness({ platform: "ios" });
  const behavior = await h.listeners.foreground.handleNotification();
  assert.equal(behavior.shouldPlaySound, true);
  assert.equal(behavior.shouldShowBanner, true);
  assert.equal(behavior.shouldSetBadge, false);
  await h.service.registerDevicePushToken();
  assert.ok(!h.calls.includes("channel"));
  assert.equal(h.calls.find((call) => call[0] === "save")[1].platform, "ios");
});

test("notification tap preserves cold-start chat navigation, deduplicates and removes listener", async () => {
  const h = pushHarness();
  const response = { notification: { request: { identifier: "message-1", content: { data: { kind: "message", roomId: "room-1" } } } } };
  h.listeners.lastResponse = response;
  const targets = [];
  const cleanup = await h.service.registerNotificationResponseHandler((target) => targets.push(target));
  h.listeners.response(response);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].pathname, "/group-chat");
  assert.equal(targets[0].params.chatId, "room-1");
  cleanup();
  assert.equal(h.listeners.response, undefined);
});

function googleHarness({ platform = "android", expoGo = false, cancelled = false } = {}) {
  const calls = [];
  const deps = {
    "expo-constants": { __esModule: true, default: { executionEnvironment: expoGo ? "storeClient" : "standalone" } },
    "react-native": { Platform: { OS: platform } }
  };
  if (platform === "android" && !expoGo) deps["@react-native-google-signin/google-signin"] = {
    GoogleSignin: {
      configure: (options) => calls.push(["configure", options]),
      hasPlayServices: async () => calls.push(["play-services"]),
      signOut: async () => calls.push(["sign-out"]),
      signIn: async () => ({ type: cancelled ? "cancelled" : "success" }),
      getTokens: async () => { calls.push(["tokens"]); return { accessToken: "google-access-token" }; }
    },
    isSuccessResponse: (response) => response.type === "success"
  };
  return { service: loadService("services/google-signin-android.ts", deps), calls };
}

test("native Google Android returns the accessToken required by the existing backend", async () => {
  const h = googleHarness();
  assert.equal(await h.service.getAndroidGoogleAccessToken(), "google-access-token");
  assert.equal(h.calls[0][1].webClientId, "web-client");
  assert.equal(h.calls[1][0], "play-services");
});

test("Google cancellation does not retrieve tokens", async () => {
  const h = googleHarness({ cancelled: true });
  assert.equal(await h.service.getAndroidGoogleAccessToken(), null);
  assert.ok(!h.calls.some((call) => call[0] === "tokens"));
});

for (const options of [{ platform: "ios" }, { platform: "web" }, { expoGo: true }]) {
  test(`native Google module never evaluates on ${JSON.stringify(options)}`, async () => {
    const h = googleHarness(options);
    await assert.rejects(h.service.getAndroidGoogleAccessToken());
    assert.equal(h.calls.length, 0);
  });
}

test("Expo native configuration preserves iOS entitlements/schemes and isolates Android launcher/channel", async () => {
  const { getPrebuildConfigAsync } = require("@expo/prebuild-config");
  const { compileModsAsync } = require("expo/config-plugins");
  const original = JSON.parse(readFileSync(path.join(root, "app.json"), "utf8")).expo;
  const { exp } = await getPrebuildConfigAsync(root, { platforms: ["ios", "android"] });
  assert.deepEqual(exp.ios, original.ios);
  const result = await compileModsAsync(exp, { projectRoot: root, platforms: ["ios", "android"], introspect: true });
  const ios = result._internal.modResults.ios;
  assert.equal(ios.infoPlist.CFBundleVersion, original.ios.buildNumber);
  assert.deepEqual(ios.entitlements["com.apple.developer.applesignin"], ["Default"]);
  assert.equal(ios.entitlements["aps-environment"], "development");
  assert.equal(ios.infoPlist.NSLocalNetworkUsageDescription, undefined);
  assert.equal(ios.infoPlist.NSBonjourServices, undefined);
  const schemes = ios.infoPlist.CFBundleURLTypes.flatMap((entry) => entry.CFBundleURLSchemes);
  assert.deepEqual(schemes, [...original.scheme, original.ios.bundleIdentifier]);
  const androidApp = result._internal.modResults.android.manifest.manifest.application[0];
  const channel = androidApp["meta-data"].find((entry) => entry.$["android:name"] === "com.google.firebase.messaging.default_notification_channel_id");
  assert.equal(channel.$["android:value"], "default");
  const androidSchemes = androidApp.activity[0]["intent-filter"].flatMap((entry) => entry.data || []).map((entry) => entry.$["android:scheme"]);
  assert.ok(androidSchemes.includes("exp+polo-connect"));
  assert.ok(androidSchemes.includes("polo-connect"));
});

function evaluateAppConfig(platform, firebase) {
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(path.join(root, "app.config.js"), "utf8"), {
    module,
    __dirname: root,
    process: { env: { EAS_BUILD_PLATFORM: platform } },
    require(id) {
      if (id === "node:fs") return { existsSync: () => Boolean(firebase), readFileSync: () => JSON.stringify(firebase) };
      if (id === "node:path") return path;
      throw new Error(`Unexpected dependency ${id}`);
    }
  });
  return module.exports({ config: JSON.parse(readFileSync(path.join(root, "app.json"), "utf8")).expo });
}

test("Android EAS build rejects missing FCM app config and a Firebase config for another package", () => {
  assert.throws(() => evaluateAppConfig("android"), /Android requires google-services/);
  assert.throws(() => evaluateAppConfig("android", { project_info: { project_number: "123" }, client: [] }), /com.poloconnect.app/);
});

test("Android accepts its Firebase config while iOS requires no Android credentials", () => {
  const firebase = { project_info: { project_number: "123" }, client: [{ client_info: { android_client_info: { package_name: "com.poloconnect.app" } } }] };
  assert.equal(evaluateAppConfig("android", firebase).android.googleServicesFile, "./google-services.json");
  const original = JSON.parse(readFileSync(path.join(root, "app.json"), "utf8")).expo;
  assert.equal(JSON.stringify(evaluateAppConfig("ios").ios), JSON.stringify(original.ios));
});
