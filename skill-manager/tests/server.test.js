const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { TextDecoder } = require("node:util");

const { SkillManager } = require("../src/skill-manager");
const {
  MAX_REQUEST_BODY_BYTES,
  createRuntimeAppContext,
  createSkillServer,
  parsePort
} = require("../src/server");

function writeSkill(dir, content) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), content, "utf8");
}

function withCloseConnection(options = {}) {
  return {
    ...options,
    headers: {
      connection: "close",
      ...(options.headers || {})
    }
  };
}

async function readJson(url, options) {
  const response = await fetch(url, withCloseConnection(options));
  return {
    status: response.status,
    json: await response.json()
  };
}

async function readText(url, options) {
  const response = await fetch(url, withCloseConnection(options));
  return {
    status: response.status,
    text: await response.text()
  };
}

async function readResponse(url, options) {
  const response = await fetch(url, withCloseConnection(options));
  return {
    status: response.status,
    text: await response.text()
  };
}

async function readJsonText(url, options) {
  const response = await fetch(url, withCloseConnection(options));
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    status: response.status,
    text: new TextDecoder("utf-8").decode(bytes)
  };
}

async function closeServer(server) {
  server.closeIdleConnections?.();
  server.closeAllConnections?.();

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

test("HTTP API returns skills and saves override descriptions", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");

  writeSkill(
    path.join(userSkillsDir, "alpha"),
    `---
name: alpha
description: Alpha description
---
`
  );

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-15T11:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const skillsResponse = await readJson(`${baseUrl}/api/skills`);
    assert.equal(skillsResponse.status, 200);
    assert.equal(skillsResponse.json.skills[0].description, "用于处理与 alpha 相关的任务，具体能力可查看该 skill 的原始说明。");

    const saveResponse = await readJson(`${baseUrl}/api/skills/user%3Aalpha/override`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        description: "Manual summary"
      })
    });

    assert.equal(saveResponse.status, 200);
    assert.equal(saveResponse.json.skill.description, "Manual summary");

    const afterResponse = await readJson(`${baseUrl}/api/skills`);
    assert.equal(afterResponse.json.skills[0].overrideDescription, "Manual summary");
    assert.equal(afterResponse.json.skills[0].description, "Manual summary");

    const activityResponse = await readJson(`${baseUrl}/api/activity`);
    assert.equal(activityResponse.status, 200);
    assert.equal(activityResponse.json.activity[0].type, "description-overridden");
  } finally {
    await closeServer(server);
  }
});

test("Static file serving blocks traversal outside the static directory", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-static-"));
  const staticDir = path.join(root, "static");
  const siblingDir = path.join(root, "static-other");
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");

  fs.mkdirSync(staticDir, { recursive: true });
  fs.mkdirSync(siblingDir, { recursive: true });
  fs.writeFileSync(path.join(staticDir, "index.html"), "<!doctype html><p>safe</p>", "utf8");
  fs.writeFileSync(path.join(siblingDir, "secret.txt"), "do not expose", "utf8");

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager, staticDir });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const response = await readResponse(`${baseUrl}/../static-other/secret.txt`);
    assert.equal(response.status, 404);
    assert.doesNotMatch(response.text, /do not expose/);
  } finally {
    await closeServer(server);
  }
});

test("Override API rejects malformed JSON with a controlled 400", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-override-invalid-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");

  writeSkill(
    path.join(userSkillsDir, "alpha"),
    `---
name: alpha
description: Alpha description
---
`
  );

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const response = await readResponse(`${baseUrl}/api/skills/user%3Aalpha/override`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: "{"
    });

    assert.equal(response.status, 400);
    assert.match(response.text, /invalid json/i);
  } finally {
    await closeServer(server);
  }
});

test("Override API rejects invalid payload types with a controlled 400", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-override-payload-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");

  writeSkill(
    path.join(userSkillsDir, "alpha"),
    `---
name: alpha
description: Alpha description
---
`
  );

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const response = await readResponse(`${baseUrl}/api/skills/user%3Aalpha/override`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        description: {}
      })
    });

    assert.equal(response.status, 400);
    assert.match(response.text, /invalid override payload/i);
  } finally {
    await closeServer(server);
  }
});

test("Override API rejects oversized request bodies with a controlled 413", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-override-large-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");

  writeSkill(
    path.join(userSkillsDir, "alpha"),
    `---
name: alpha
description: Alpha description
---
`
  );

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const oversizedBody = JSON.stringify({
      description: "a".repeat(MAX_REQUEST_BODY_BYTES)
    });
    const response = await readResponse(`${baseUrl}/api/skills/user%3Aalpha/override`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: oversizedBody
    });

    assert.equal(response.status, 413);
    assert.match(response.text, /request body too large/i);
  } finally {
    await closeServer(server);
  }
});

test("API error responses keep readable Chinese text", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-errors-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const missingSkillResponse = await readJsonText(`${baseUrl}/api/skills/user%3Amissing/override`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        description: "Manual summary"
      })
    });
    assert.equal(missingSkillResponse.status, 404);
    assert.match(missingSkillResponse.text, /未找到该 skill/);

    const missingFileResponse = await readJsonText(`${baseUrl}/does-not-exist.js`);
    assert.equal(missingFileResponse.status, 404);
    assert.match(missingFileResponse.text, /未找到资源/);
  } finally {
    await closeServer(server);
  }
});

test("Static UI text is localized in Chinese except for skill names", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-ui-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const indexResponse = await readText(`${baseUrl}/`);
    assert.equal(indexResponse.status, 200);
    assert.match(indexResponse.text, /skill 管理器/i);
    assert.match(indexResponse.text, /最近活动/);
    assert.match(indexResponse.text, /首次发现/);
    assert.match(indexResponse.text, /桌面设置/);
    assert.match(indexResponse.text, /开机自启动/);
    assert.match(indexResponse.text, /关闭窗口时最小化到托盘/);
    assert.doesNotMatch(indexResponse.text, /Codex Skill Manager/);

    const appResponse = await readText(`${baseUrl}/app.js`);
    assert.equal(appResponse.status, 200);
    assert.match(appResponse.text, /手动覆盖/);
    assert.match(appResponse.text, /skill 已移除/);
    assert.match(appResponse.text, /\/api\/desktop\/settings/);
    assert.match(appResponse.text, /桌面设置已连接/);
  } finally {
    await closeServer(server);
  }
});

test("Desktop settings API loads defaults and saves updates", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-desktop-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");
  const desktopSettingsPath = path.join(root, "desktop-settings.json");

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager, desktopSettingsPath });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const initialResponse = await readJson(`${baseUrl}/api/desktop/settings`);
    assert.equal(initialResponse.status, 200);
    assert.deepEqual(initialResponse.json.settings, {
      launchAtStartup: false,
      minimizeToTrayOnClose: true
    });

    const nextSettings = {
      launchAtStartup: true
    };
    const saveResponse = await readJson(`${baseUrl}/api/desktop/settings`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(nextSettings)
    });

    assert.equal(saveResponse.status, 200);
    assert.deepEqual(saveResponse.json.settings, {
      launchAtStartup: true,
      minimizeToTrayOnClose: true
    });

    const afterResponse = await readJson(`${baseUrl}/api/desktop/settings`);
    assert.equal(afterResponse.status, 200);
    assert.deepEqual(afterResponse.json.settings, {
      launchAtStartup: true,
      minimizeToTrayOnClose: true
    });

    assert.deepEqual(
      JSON.parse(fs.readFileSync(desktopSettingsPath, "utf8")),
      {
        launchAtStartup: true,
        minimizeToTrayOnClose: true
      }
    );
  } finally {
    await closeServer(server);
  }
});

test("Desktop settings API creates the parent directory on first save", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-desktop-nested-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");
  const desktopSettingsDir = path.join(root, "missing", "desktop");
  const desktopSettingsPath = path.join(desktopSettingsDir, "settings.json");

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager, desktopSettingsPath });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    assert.equal(fs.existsSync(desktopSettingsDir), false);

    const saveResponse = await readJson(`${baseUrl}/api/desktop/settings`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        launchAtStartup: true
      })
    });

    assert.equal(saveResponse.status, 200);
    assert.equal(fs.existsSync(desktopSettingsDir), true);
    assert.deepEqual(saveResponse.json.settings, {
      launchAtStartup: true,
      minimizeToTrayOnClose: true
    });
    assert.deepEqual(
      JSON.parse(fs.readFileSync(desktopSettingsPath, "utf8")),
      {
        launchAtStartup: true,
        minimizeToTrayOnClose: true
      }
    );
  } finally {
    await closeServer(server);
  }
});

test("Desktop settings API rejects invalid JSON and invalid payloads", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-desktop-invalid-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");
  const desktopSettingsPath = path.join(root, "desktop-settings.json");

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager, desktopSettingsPath });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const invalidJsonResponse = await readResponse(`${baseUrl}/api/desktop/settings`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: "{"
    });

    assert.equal(invalidJsonResponse.status, 400);
    assert.match(invalidJsonResponse.text, /invalid json/i);

    const arrayPayloadResponse = await readJson(`${baseUrl}/api/desktop/settings`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify([])
    });

    assert.equal(arrayPayloadResponse.status, 400);
    assert.match(arrayPayloadResponse.json.error, /invalid desktop settings/i);

    const invalidTypeResponse = await readJson(`${baseUrl}/api/desktop/settings`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        launchAtStartup: "yes"
      })
    });

    assert.equal(invalidTypeResponse.status, 400);
    assert.match(invalidTypeResponse.json.error, /invalid desktop settings/i);

    const unknownKeyResponse = await readJson(`${baseUrl}/api/desktop/settings`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        unknown: true
      })
    });

    assert.equal(unknownKeyResponse.status, 400);
    assert.match(unknownKeyResponse.json.error, /invalid desktop settings/i);

    const afterResponse = await readJson(`${baseUrl}/api/desktop/settings`);
    assert.deepEqual(afterResponse.json.settings, {
      launchAtStartup: false,
      minimizeToTrayOnClose: true
    });
  } finally {
    await closeServer(server);
  }
});

test("Desktop settings API normalizes malformed on-disk settings", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-desktop-malformed-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");
  const desktopSettingsPath = path.join(root, "desktop-settings.json");

  fs.writeFileSync(desktopSettingsPath, "{\"launchAtStartup\":\"oops\"", "utf8");

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager, desktopSettingsPath });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const response = await readJson(`${baseUrl}/api/desktop/settings`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.json.settings, {
      launchAtStartup: false,
      minimizeToTrayOnClose: true
    });
  } finally {
    await closeServer(server);
  }
});

test("Desktop settings API preserves valid persisted keys when disk data is partially invalid", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-desktop-partial-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");
  const desktopSettingsPath = path.join(root, "desktop-settings.json");

  fs.writeFileSync(
    desktopSettingsPath,
    JSON.stringify({
      launchAtStartup: true,
      minimizeToTrayOnClose: "oops"
    }),
    "utf8"
  );

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager, desktopSettingsPath });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const response = await readJson(`${baseUrl}/api/desktop/settings`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.json.settings, {
      launchAtStartup: true,
      minimizeToTrayOnClose: true
    });

    const saveResponse = await readJson(`${baseUrl}/api/desktop/settings`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        minimizeToTrayOnClose: false
      })
    });

    assert.equal(saveResponse.status, 200);
    assert.deepEqual(saveResponse.json.settings, {
      launchAtStartup: true,
      minimizeToTrayOnClose: false
    });

    assert.deepEqual(
      JSON.parse(fs.readFileSync(desktopSettingsPath, "utf8")),
      {
        launchAtStartup: true,
        minimizeToTrayOnClose: false
      }
    );
  } finally {
    await closeServer(server);
  }
});

test("createRuntimeAppContext reads APP_MODE, APP_DATA_DIR, PORT, and cwd overrides", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-runtime-"));
  const desktopContext = createRuntimeAppContext({
    env: {
      APP_MODE: "desktop",
      APP_DATA_DIR: root,
      PORT: "4321"
    },
    cwd: path.join(root, "workspace")
  });

  assert.equal(desktopContext.mode, "desktop");
  assert.equal(desktopContext.port, 4321);
  assert.equal(desktopContext.dataDir, path.join(root, "data"));
  assert.equal(desktopContext.desktopSettingsPath, path.join(root, "desktop-settings.json"));

  const browserCwd = path.join(root, "browser-workspace");
  const browserContext = createRuntimeAppContext({
    env: {
      APP_MODE: "browser",
      PORT: "4322"
    },
    cwd: browserCwd
  });

  assert.equal(browserContext.mode, "browser");
  assert.equal(browserContext.port, 4322);
  assert.equal(browserContext.dataDir, path.join(browserCwd, "data"));
  assert.equal(browserContext.desktopSettingsPath, path.join(browserCwd, "desktop-settings.json"));
});

test("parsePort falls back to the default port for invalid values", () => {
  assert.equal(parsePort("4321"), 4321);
  assert.equal(parsePort("0"), 0);
  assert.equal(parsePort("abc"), 3210);
  assert.equal(parsePort("-1"), 3210);
  assert.equal(parsePort("65536"), 3210);
});

test("Desktop settings API stays inert for browser startup", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-browser-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir: path.join(root, "data"),
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const initialResponse = await readJson(`${baseUrl}/api/desktop/settings`);
    assert.equal(initialResponse.status, 200);
    assert.equal(initialResponse.json.settings, null);

    const saveResponse = await readJson(`${baseUrl}/api/desktop/settings`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        launchAtStartup: true
      })
    });

    assert.equal(saveResponse.status, 200);
    assert.equal(saveResponse.json.settings, null);
    assert.equal(fs.existsSync(path.join(root, "desktop-settings.json")), false);
  } finally {
    await closeServer(server);
  }
});

test("Desktop settings UI copy and app integration are exposed by static assets", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-server-desktop-ui-"));
  const userSkillsDir = path.join(root, "codex", "skills");
  const systemSkillsDir = path.join(root, "codex", "skills", ".system");
  const pluginCacheDir = path.join(root, "codex", "plugins", "cache");
  const dataDir = path.join(root, "data");

  const manager = new SkillManager({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now: () => "2026-05-16T08:00:00.000Z"
  });
  manager.refresh();

  const server = createSkillServer({ manager });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const indexResponse = await readText(`${baseUrl}/`);
    assert.equal(indexResponse.status, 200);
    assert.match(indexResponse.text, /桌面设置/);
    assert.match(indexResponse.text, /开机自启动/);
    assert.match(indexResponse.text, /关闭窗口时最小化到托盘/);
    assert.match(indexResponse.text, /本地数据位置/);

    const appResponse = await readText(`${baseUrl}/app.js`);
    assert.equal(appResponse.status, 200);
    assert.match(appResponse.text, /\/api\/desktop\/settings/);
    assert.match(appResponse.text, /launchAtStartup/);
    assert.match(appResponse.text, /minimizeToTrayOnClose/);
    assert.match(appResponse.text, /desktopDataPath/);
    assert.match(appResponse.text, /saveDesktopSettings/);
    assert.match(appResponse.text, /set_launch_at_startup/);
  } finally {
    await closeServer(server);
  }
});
