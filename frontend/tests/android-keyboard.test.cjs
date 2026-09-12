const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const jsx = (type, props) => ({ type, props });
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
const find = (tree, type) => nodes(tree).find(node => node.type === type);

function harness(file, os, baseline = false) {
  let index = 0;
  const hooks = [], effects = [], frames = [], timers = [], listeners = new Map();
  const keyboard = {
    visible: false, isVisible() { return this.visible; }, dismiss() {},
    addListener(name, callback) {
      const callbacks = listeners.get(name) || new Set();
      listeners.set(name, callbacks);
      callbacks.add(callback);
      return { remove: () => callbacks.delete(callback) };
    }
  };
  const react = {
    useRef(value) { const slot = index++; return hooks[slot] ||= { current: value }; },
    useState(value) {
      const slot = index++;
      if (!(slot in hooks)) hooks[slot] = value;
      return [hooks[slot], next => { hooks[slot] = typeof next === "function" ? next(hooks[slot]) : next; }];
    },
    useCallback: fn => fn, useMemo: fn => fn(), useEffect: fn => effects.push(fn)
  };
  const dependencies = {
    "react": react, "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      Platform: { OS: os }, Keyboard: keyboard, StyleSheet: { create: styles => styles },
      Animated: { View: "AnimatedView", ScrollView: "AnimatedScrollView", Value: class {}, timing: () => ({ start() {} }) },
      AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) },
      ...Object.fromEntries(["View", "Text", "TextInput", "ScrollView", "KeyboardAvoidingView", "Pressable", "Image", "ActivityIndicator"].map(name => [name, name]))
    },
    "expo-router": { useRouter: () => ({}), useLocalSearchParams: () => ({ chatId: "room" }), useFocusEffect() {}, usePathname: () => "/market-publish" },
    "expo-image-picker": {}, "expo-web-browser": {}, "@expo/vector-icons": { Ionicons: "Ionicons" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) },
    "@/constants/theme": { useThemeColors: () => ({}), useTheme: () => ({ mode: "light" }) },
    "@/contexts/AuthContext": { useAuth: () => ({ user: { id: "user" } }) },
    "@/contexts/LocaleContext": { useLocale: () => ({ t: key => key }) },
    "@/contexts/MarketContext": { useMarket: () => ({}) },
    "@/contexts/CommunityContext": { useCommunity: () => ({ joinedChats: [{ id: "room" }], roomsLoaded: true }) },
    "@/contexts/NotificationsContext": { useNotifications: () => ({ unreadCount: 0 }) },
    "@/components/Screen": { Screen: "Screen" }, "@/components/AppDrawer": { useAppDrawer: () => ({}) },
    "@/components/ReportModal": { ReportModal: "ReportModal" }, "@/services/api/moderation": {},
    "@/services/api/market": {}, "@/services/marketplace-payment": {},
    "@/services/api/users": { resolveUploadedUrl: () => null },
    "@/services/api/community": { listMessages: async () => [], subscribeToRoomMessages: () => () => {} }
  };
  const source = baseline
    ? execFileSync("git", ["show", `HEAD:frontend/${file}`], { cwd: root, encoding: "utf8" })
    : readFileSync(path.join(root, file), "utf8");
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, {
    exports, requestAnimationFrame: fn => frames.push(fn),
    setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {},
    require(id) {
      if (id.startsWith("@/assets/")) return 0;
      assert.ok(id in dependencies, `Unexpected import: ${id}`);
      return dependencies[id];
    }
  });
  return {
    keyboard, listeners, timers,
    render(props) { index = 0; return (exports.default || exports.Screen)(props || {}); },
    mountEffects() { return effects.map(fn => fn()).filter(fn => typeof fn === "function"); },
    flushFrames() { while (frames.length) frames.shift()(); },
    emit(name) { keyboard.visible = name === "keyboardDidShow"; for (const fn of listeners.get(name) || []) fn(); }
  };
}

test("only the opted-in Android publishing screen changes keyboard avoidance and drag dismissal", () => {
  for (const os of ["android", "ios", "web"]) {
    for (const optedIn of [false, true]) {
      const before = harness("components/Screen.tsx", os, true).render({});
      const after = harness("components/Screen.tsx", os).render({ androidKeyboardAware: optedIn });
      const expectedChange = os === "android" && optedIn;
      assert.equal(find(after, "KeyboardAvoidingView").props.behavior,
        expectedChange ? "padding" : find(before, "KeyboardAvoidingView").props.behavior);
      const scroll = find(after, "AnimatedScrollView").props;
      assert.equal(scroll.keyboardDismissMode,
        expectedChange ? "none" : find(before, "AnimatedScrollView").props.keyboardDismissMode);
      assert.equal(typeof scroll.onScrollBeginDrag, expectedChange ? "undefined" : "function");
      assert.equal(scroll.keyboardShouldPersistTaps, "handled");
    }
  }
});

test("Android description focus waits for keyboard, targets the input after resize, and cancels stale focus", () => {
  const h = harness("app/market-publish.tsx", "android");
  const tree = h.render();
  const cleanups = h.mountEffects();
  const description = nodes(tree).find(node => node.props?.placeholder === "marketPublish.descriptionPlaceholder");
  const calls = [];
  let focused = true;
  const input = { isFocused: () => focused };
  description.props.ref.current = input;
  tree.props.scrollViewRef.current = {
    scrollResponderScrollNativeHandleToKeyboard: (...args) => calls.push(args),
    scrollToEnd: () => assert.fail("Android must not scroll to the form's end")
  };
  description.props.onFocus();
  h.flushFrames();
  assert.equal(calls.length, 0);
  assert.equal(h.timers.length, 0);
  h.emit("keyboardDidShow");
  h.flushFrames();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], input);
  assert.equal(calls[0][2], true);
  tree.props.onScrollViewLayout();
  focused = false;
  h.flushFrames();
  assert.equal(calls.length, 1);
  focused = true;
  tree.props.onScrollViewLayout();
  h.emit("keyboardDidHide");
  h.flushFrames();
  assert.equal(calls.length, 1);
  cleanups.forEach(fn => fn());
  assert.equal(h.listeners.get("keyboardDidShow").size, 0);
});

test("iOS description focus preserves the previous scroll handler and timing", () => {
  for (const baseline of [true, false]) {
    const h = harness("app/market-publish.tsx", "ios", baseline);
    const tree = h.render();
    h.mountEffects();
    let calls = 0;
    tree.props.scrollViewRef.current = { scrollToEnd: options => { assert.equal(options.animated, true); calls++; } };
    nodes(tree).find(node => node.props?.placeholder === "marketPublish.descriptionPlaceholder").props.onFocus();
    assert.equal(h.timers[0].delay, 120);
    h.timers[0].fn();
    assert.equal(calls, 1);
    assert.equal(h.listeners.size, 0);
  }
});

test("chat Android keeps input/send outside the scrolling messages and scrolls after resize/show/hide", () => {
  const h = harness("app/group-chat.tsx", "android");
  let tree = h.render();
  const cleanups = h.mountEffects();
  const calls = [];
  find(tree, "ScrollView").props.ref.current = { scrollToEnd: options => calls.push(options) };
  const avoiding = find(tree, "KeyboardAvoidingView");
  assert.equal(avoiding.props.behavior, "padding");
  assert.equal(avoiding.props.enabled ?? true, true);
  assert.equal(find(find(tree, "ScrollView"), "TextInput"), undefined);
  assert.ok(find(avoiding, "TextInput"));
  h.emit("keyboardDidShow");
  tree = h.render();
  find(tree, "ScrollView").props.onLayout();
  h.flushFrames();
  assert.ok(calls.length >= 2);
  h.emit("keyboardDidHide");
  h.flushFrames();
  assert.equal(calls.at(-1).animated, false);
  cleanups.forEach(fn => fn());
  assert.equal(h.listeners.get("keyboardDidShow").size, 0);
  assert.equal(h.listeners.get("keyboardDidHide").size, 0);
});

test("chat iOS keyboard/input configuration remains equivalent to HEAD", () => {
  const before = harness("app/group-chat.tsx", "ios", true).render();
  const after = harness("app/group-chat.tsx", "ios").render();
  for (const type of ["KeyboardAvoidingView", "ScrollView", "TextInput"]) {
    for (const key of ["behavior", "keyboardVerticalOffset", "keyboardDismissMode", "keyboardShouldPersistTaps", "multiline", "blurOnSubmit", "returnKeyType"]) {
      assert.equal(find(after, type).props[key], find(before, type).props[key]);
    }
  }
  assert.equal(find(after, "KeyboardAvoidingView").props.enabled ?? true,
    find(before, "KeyboardAvoidingView").props.enabled ?? true);
});

test("installed RN padding tracks real keyboard overlap and does not double native resize", async () => {
  const source = readFileSync(path.join(root, "node_modules/react-native/Libraries/Components/Keyboard/KeyboardAvoidingView.js"), "utf8");
  const code = require("@babel/core").transformSync(source, {
    babelrc: false, configFile: false,
    filename: path.join(root, "node_modules/react-native/Libraries/Components/Keyboard/KeyboardAvoidingView.js"),
    presets: [require.resolve("babel-preset-expo")]
  }).code;
  const exports = {};
  const react = {
    Component: class { constructor(props) { this.props = props; } setState(next) { Object.assign(this.state, next); } },
    createRef: () => ({ current: null })
  };
  vm.runInNewContext(code, { exports, require(id) {
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id.startsWith("@babel/runtime/")) return require(id);
    if (id.endsWith("/Platform")) return { OS: "android" };
    if (id.endsWith("/StyleSheet")) return { compose: (a, b) => ({ ...a, ...b }) };
    if (id.endsWith("/View")) return "View";
    if (id === "./Keyboard") return { isVisible: () => false };
    if (id.endsWith("/AccessibilityInfo") || id.endsWith("/LayoutAnimation")) return {};
    throw new Error(`Unexpected RN dependency: ${id}`);
  } });
  const avoiding = new exports.default({ behavior: "padding", style: { flex: 1 }, keyboardVerticalOffset: 0 });
  const layout = height => ({ persist() {}, nativeEvent: { layout: { x: 0, y: 72, width: 360, height } } });
  await avoiding._onLayout(layout(700));
  avoiding._keyboardEvent = { endCoordinates: { screenY: 500 }, duration: 0 };
  await avoiding._updateBottomIfNecessary();
  assert.equal(avoiding.render().props.style.paddingBottom, 272);
  assert.equal(avoiding.render().props.style.height, undefined);
  await avoiding._onLayout(layout(428)); // Android already resized to keyboard top.
  assert.equal(avoiding.render().props.style.paddingBottom, 0);
  avoiding._keyboardEvent.endCoordinates.screenY = 450; // Keyboard height changed.
  await avoiding._updateBottomIfNecessary();
  assert.equal(avoiding.render().props.style.paddingBottom, 50);
  avoiding._keyboardEvent = null;
  await avoiding._updateBottomIfNecessary();
  await avoiding._onLayout(layout(700));
  assert.equal(avoiding.render().props.style.paddingBottom, 0);
  assert.equal(avoiding.render().props.style.flex, 1);
});
