const fs = require("node:fs");
const path = require("node:path");

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

class JsonFileStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    ensureDirectory(this.dataDir);
    this.stateFile = path.join(this.dataDir, "skill-state.json");
    this.overridesFile = path.join(this.dataDir, "overrides.json");
  }

  loadState() {
    return readJson(this.stateFile, {
      skills: {},
      activity: []
    });
  }

  saveState(state) {
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2), "utf8");
  }

  loadOverrides() {
    return readJson(this.overridesFile, {});
  }

  saveOverrides(overrides) {
    fs.writeFileSync(this.overridesFile, JSON.stringify(overrides, null, 2), "utf8");
  }
}

module.exports = {
  JsonFileStore
};
