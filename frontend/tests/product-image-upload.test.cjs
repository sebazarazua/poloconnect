const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");

function loadTs(relativePath, dependencies = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path.join(root, relativePath), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require(id) {
      assert.ok(id in dependencies, `Unexpected dependency: ${id}`);
      return dependencies[id];
    },
    Blob, File, FormData, TextEncoder, Uint8Array, AbortController,
    Error, TypeError, setTimeout, clearTimeout,
    ...globals
  }, { filename: relativePath });
  return exports;
}

// Exercise the installed Expo serializer, including its RN FormData patch.
const { installFormDataPatch } = loadTs("node_modules/expo/src/winter/FormData.ts");
class RNFormData {
  constructor() { this._parts = []; }
}
installFormDataPatch(RNFormData);
const { convertFormDataAsync } = loadTs("node_modules/expo/src/winter/fetch/convertFormData.ts", {
  "../../utils/blobUtils": loadTs("node_modules/expo/src/utils/blobUtils.ts")
});

function harness(options = {}) {
  const requests = [];
  class NativeFile {
    constructor(uri) {
      this.uri = uri;
      this.name = uri.split("/").pop();
      this.type = "image/png";
      this.exists = options.exists ?? true;
      this.size = options.size ?? png.length;
    }
    async bytes() { return new Uint8Array(png); }
  }
  const api = loadTs("services/api/market.ts", {
    "expo-file-system": { File: NativeFile },
    "react-native": { Platform: { OS: options.os ?? "ios" } },
    "@/services/api/client": {
      async apiRequest(route, init) {
        if (route !== "/products/upload") {
          requests.push({ route, init });
          return options.product;
        }
        const multipart = await convertFormDataAsync(init.body);
        const decoded = await new Response(multipart.body, {
          headers: { "content-type": `multipart/form-data; boundary=${multipart.boundary}` }
        }).formData();
        requests.push({ route, init, file: decoded.get("file") });
        if (options.error) throw options.error;
        return { url: options.url ?? "/api/v1/media/products/test.png" };
      },
      resolveApiMediaUrl: (url) => `https://api.example${url}`
    }
  }, {
    FormData: options.os === "web" ? FormData : RNFormData,
    fetch: options.fetch ?? (() => { throw new Error("Unexpected fetch"); }),
    ...options.globals
  });
  return { upload: api.uploadProductImage, fetchProduct: api.fetchProduct, updateProduct: api.updateProduct, requests };
}

test("regression: Expo rejects the old URI-only file part before making a request", async () => {
  const form = new RNFormData();
  form.append("file", { uri: "file:///camera/photo.png", name: "photo.png", type: "image/png" });
  await assert.rejects(convertFormDataAsync(form), /Unsupported FormDataPart implementation/);
});

for (const os of ["ios", "android"]) {
  for (const source of ["camera", "gallery"]) {
    test(`${os} ${source}: multipart contains the actual image bytes`, async () => {
      const h = harness({ os });
      const url = await h.upload({ uri: `file:///cache/${source}/photo.png`, fileName: "original.heic", mimeType: "image/heic" });
      assert.equal(url, "https://api.example/api/v1/media/products/test.png");
      assert.equal(h.requests.length, 1);
      const { file, route, init } = h.requests[0];
      assert.equal(route, "/products/upload");
      assert.equal(init.method, "POST");
      assert.equal(file.name, "photo.png");
      assert.equal(file.type, "image/png");
      assert.deepEqual(Buffer.from(await file.arrayBuffer()), png);
    });
  }
}

test("web: submits the picker's File instead of serializing a URI object", async () => {
  const h = harness({ os: "web" });
  await h.upload({ uri: "blob:photo", file: new File([png], "photo.png", { type: "image/png" }) });
  assert.deepEqual(Buffer.from(await h.requests[0].file.arrayBuffer()), png);
});

test("web: reads the local blob URI when the picker omits File", async () => {
  const h = harness({ os: "web", fetch: async () => new Response(png, { headers: { "content-type": "image/png" } }) });
  await h.upload({ uri: "blob:photo", fileName: "photo.png" });
  assert.deepEqual(Buffer.from(await h.requests[0].file.arrayBuffer()), png);
});

for (const [label, options, message] of [
  ["missing file", { exists: false }, /no está disponible/],
  ["empty file", { size: 0 }, /vacía/],
  ["oversized file", { size: 8 * 1024 * 1024 + 1 }, /8 MB/]
]) {
  test(`${label} is rejected before upload`, async () => {
    const h = harness(options);
    await assert.rejects(h.upload({ uri: "file:///photo.png" }), message);
    assert.equal(h.requests.length, 0);
  });
}

test("preserves a server error so the screen can show the cause", async () => {
  const error = new Error("No se pudo guardar la imagen.");
  const h = harness({ error });
  await assert.rejects(h.upload({ uri: "file:///photo.png" }), (received) => received === error);
});

test("a missing response URL does not create an empty preview", async () => {
  const h = harness({ url: "" });
  await assert.rejects(h.upload({ uri: "file:///photo.png" }), /no devolvió/);
});

test("network errors have an actionable message", async () => {
  const h = harness({ error: new TypeError("Network request failed") });
  await assert.rejects(h.upload({ uri: "file:///photo.png" }), /Revisá tu conexión/);
});

test("upload timeout is reported and its timer is released", async () => {
  let cleared = false;
  const h = harness({ globals: {
    setTimeout(callback, delay) { assert.equal(delay, 90_000); callback(); return 1; },
    clearTimeout(id) { assert.equal(id, 1); cleared = true; }
  }, error: new Error("Aborted") });
  await assert.rejects(h.upload({ uri: "file:///photo.png" }), /tardó demasiado/);
  assert.equal(cleared, true);
});

test("editing a reviewed listing loads its detail and preserves all publication fields", async () => {
  const imageUrls = ["/media/products/one.png", "/media/products/two.png"];
  const phone = "+54 11 1234 5678";
  const product = {
    id: "reviewed", ownerId: "seller", name: "Casco", price: 123.45, currency: "ARS",
    category: "equipamiento", status: "Usado", publicationStatus: "pending_review",
    description: `Descripcion completa<!--pc:contactPhone=${encodeURIComponent(phone)}-->`,
    image: imageUrls[0], images: imageUrls
  };
  const h = harness({ product });
  const loaded = await h.fetchProduct(product.id);
  assert.equal(h.requests[0].route, "/products/reviewed");
  assert.equal(loaded.description, "Descripcion completa");
  assert.equal(loaded.contactPhone, phone);
  assert.equal(loaded.price, 123.45);
  assert.equal(loaded.publicationStatus, "pending_review");
  await h.updateProduct(loaded.id, loaded);
  const saved = JSON.parse(h.requests[1].init.body);
  assert.equal(h.requests[1].init.method, "PUT");
  assert.equal(saved.name, product.name);
  assert.equal(saved.price, product.price);
  assert.equal(saved.currency, product.currency);
  assert.equal(saved.status, product.status);
  assert.equal(saved.category, product.category);
  assert.deepEqual(saved.imageUrls, imageUrls.map((url) => `https://api.example${url}`));
  assert.ok(saved.description.includes(`<!--pc:contactPhone=${encodeURIComponent(phone)}-->`));
});
