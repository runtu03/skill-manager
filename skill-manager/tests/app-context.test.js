const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createAppContext } = require("../src/app-context");

test("createAppContext uses desktop data dir and localhost port", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-desktop-context-"));
  const context = createAppContext({
    mode: "desktop",
    appDataDir: root,
    port: 3211
  });

  assert.equal(context.port, 3211);
  assert.equal(context.host, "127.0.0.1");
  assert.equal(context.dataDir, path.join(root, "data"));
  assert.equal(context.desktopSettingsPath, path.join(root, "desktop-settings.json"));
});

test("createAppContext keeps browser mode data in the current workspace", () => {
  const context = createAppContext({
    mode: "browser",
    appDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "skill-browser-context-")),
    port: 3210
  });

  assert.equal(context.port, 3210);
  assert.equal(context.host, "127.0.0.1");
  assert.equal(context.dataDir, path.join(process.cwd(), "data"));
  assert.equal(context.desktopSettingsPath, path.join(process.cwd(), "desktop-settings.json"));
});
