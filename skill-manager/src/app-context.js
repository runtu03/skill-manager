const path = require("node:path");

function createAppContext({ mode = "browser", appDataDir = process.cwd(), port = 3210 } = {}) {
  const rootDir = mode === "desktop" ? appDataDir : process.cwd();

  return {
    mode,
    host: "127.0.0.1",
    port,
    dataDir: path.join(rootDir, "data"),
    desktopSettingsPath: path.join(rootDir, "desktop-settings.json")
  };
}

module.exports = { createAppContext };
