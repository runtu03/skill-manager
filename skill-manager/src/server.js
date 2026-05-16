const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { URL } = require("node:url");

const { createAppContext } = require("./app-context");
const {
  InvalidDesktopSettingsError,
  loadDesktopSettings,
  saveDesktopSettings
} = require("./desktop-settings");
const { SkillManager } = require("./skill-manager");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, contentType, payload) {
  response.writeHead(statusCode, {
    "content-type": contentType
  });
  response.end(payload);
}

function readRequestBody(request, { maxBytes = MAX_REQUEST_BODY_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bodySize = 0;
    let settled = false;

    function cleanup() {
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("error", onError);
    }

    function rejectOnce(error) {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    }

    function onData(chunk) {
      if (settled) {
        return;
      }
      bodySize += Buffer.byteLength(chunk);
      if (bodySize > maxBytes) {
        const error = new RangeError("request body too large");
        error.code = "REQUEST_BODY_TOO_LARGE";
        cleanup();
        request.resume();
        rejectOnce(error);
        return;
      }
      body += chunk;
    }

    function onEnd() {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(body);
    }

    function onError(error) {
      rejectOnce(error);
    }

    request.on("data", onData);
    request.on("end", onEnd);
    request.on("error", onError);
  });
}

function parseJsonBody(body) {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new SyntaxError("invalid json");
  }
}

function parsePort(rawPort) {
  const port = Number(rawPort);
  return Number.isInteger(port) && port >= 0 && port <= 65535 ? port : 3210;
}

function createRuntimeAppContext({ env = process.env, cwd = process.cwd() } = {}) {
  const mode = env.APP_MODE || "browser";
  const appContext = createAppContext({
    mode,
    appDataDir: env.APP_DATA_DIR || cwd,
    port: parsePort(env.PORT || 3210)
  });

  if (mode === "browser") {
    return {
      ...appContext,
      dataDir: path.join(cwd, "data"),
      desktopSettingsPath: path.join(cwd, "desktop-settings.json")
    };
  }

  return appContext;
}

function createSkillServer({
  manager,
  staticDir = path.join(__dirname, "static"),
  desktopSettingsPath = null
}) {
  const clients = new Set();

  manager.subscribe(() => {
    const payload = `data: ${JSON.stringify({ updatedAt: new Date().toISOString() })}\n\n`;
    for (const response of clients) {
      response.write(payload);
    }
  });

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/api/skills") {
      sendJson(response, 200, {
        skills: manager.getSkills(),
        summary: manager.getSummary()
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/activity") {
      sendJson(response, 200, {
        activity: manager.getActivity()
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/stream") {
      response.writeHead(200, {
        "cache-control": "no-cache",
        connection: "keep-alive",
        "content-type": "text/event-stream"
      });
      response.write("retry: 1000\n\n");
      clients.add(response);
      request.on("close", () => {
        clients.delete(response);
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/desktop/settings") {
      if (!desktopSettingsPath) {
        sendJson(response, 200, {
          settings: null
        });
        return;
      }

      try {
        sendJson(response, 200, {
          settings: loadDesktopSettings(desktopSettingsPath)
        });
      } catch (error) {
        sendJson(response, 500, {
          error: "failed to load desktop settings"
        });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/desktop/settings") {
      if (!desktopSettingsPath) {
        sendJson(response, 200, {
          settings: null
        });
        return;
      }

      try {
        const body = await readRequestBody(request);
        const payload = parseJsonBody(body);
        const settings = saveDesktopSettings(desktopSettingsPath, payload);
        sendJson(response, 200, { settings });
      } catch (error) {
        if (error.code === "REQUEST_BODY_TOO_LARGE") {
          sendJson(response, 413, {
            error: "request body too large"
          });
          return;
        }

        if (error instanceof SyntaxError) {
          sendJson(response, 400, {
            error: "invalid json"
          });
          return;
        }

        if (error instanceof InvalidDesktopSettingsError) {
          sendJson(response, 400, {
            error: "invalid desktop settings payload"
          });
          return;
        }

        sendJson(response, 500, {
          error: "failed to save desktop settings"
        });
      }
      return;
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/skills/") && url.pathname.endsWith("/override")) {
      try {
        const skillId = decodeURIComponent(url.pathname.slice("/api/skills/".length, -"/override".length));
        const body = await readRequestBody(request);
        const payload = parseJsonBody(body);
        const description = payload.description === undefined ? "" : payload.description;
        if (typeof description !== "string") {
          sendJson(response, 400, {
            error: "invalid override payload"
          });
          return;
        }

        const skill = manager.setOverride(skillId, description);
        if (!skill) {
          sendJson(response, 404, {
            error: "未找到该 skill"
          });
          return;
        }

        sendJson(response, 200, { skill });
      } catch (error) {
        if (error.code === "REQUEST_BODY_TOO_LARGE") {
          sendJson(response, 413, {
            error: "request body too large"
          });
          return;
        }

        if (error instanceof SyntaxError) {
          sendJson(response, 400, {
            error: "invalid json"
          });
          return;
        }

        throw error;
      }
      return;
    }

    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const resolvedStaticDir = path.resolve(staticDir);
    const filePath = path.resolve(resolvedStaticDir, `.${requestedPath}`);
    const relativePath = path.relative(resolvedStaticDir, filePath);
    const isInsideStaticDir = relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
    if (isInsideStaticDir && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const extension = path.extname(filePath).toLowerCase();
      sendText(response, 200, MIME_TYPES[extension] || "application/octet-stream", fs.readFileSync(filePath));
      return;
    }

    sendJson(response, 404, {
      error: "未找到资源"
    });
  });
}

if (require.main === module) {
  const home = os.homedir();
  const appContext = createRuntimeAppContext();
  const manager = new SkillManager({
    userSkillsDir: path.join(home, ".codex", "skills"),
    systemSkillsDir: path.join(home, ".codex", "skills", ".system"),
    pluginCacheDir: path.join(home, ".codex", "plugins", "cache"),
    dataDir: appContext.dataDir
  });

  manager.refresh();
  manager.startWatching();

  const server = createSkillServer({
    manager,
    desktopSettingsPath: appContext.mode === "desktop" ? appContext.desktopSettingsPath : null
  });

  server.listen(appContext.port, appContext.host, () => {
    console.log(`Skill manager running at http://${appContext.host}:${appContext.port}`);
  });
}

module.exports = {
  MAX_REQUEST_BODY_BYTES,
  parsePort,
  createRuntimeAppContext,
  createSkillServer
};
