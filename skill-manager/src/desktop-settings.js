const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_DESKTOP_SETTINGS = {
  launchAtStartup: false,
  minimizeToTrayOnClose: true
};

class InvalidDesktopSettingsError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidDesktopSettingsError";
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeDesktopSettings(settings, { allowPartial = false } = {}) {
  if (!isPlainObject(settings)) {
    throw new InvalidDesktopSettingsError("invalid desktop settings payload");
  }

  const normalized = allowPartial ? {} : { ...DEFAULT_DESKTOP_SETTINGS };

  for (const key of Object.keys(settings)) {
    if (!(key in DEFAULT_DESKTOP_SETTINGS)) {
      throw new InvalidDesktopSettingsError("invalid desktop settings payload");
    }

    if (typeof settings[key] !== "boolean") {
      throw new InvalidDesktopSettingsError("invalid desktop settings payload");
    }

    normalized[key] = settings[key];
  }

  if (allowPartial) {
    return normalized;
  }

  return normalized;
}

function normalizePersistedDesktopSettings(settings) {
  if (!isPlainObject(settings)) {
    return { ...DEFAULT_DESKTOP_SETTINGS };
  }

  const normalized = { ...DEFAULT_DESKTOP_SETTINGS };

  for (const key of Object.keys(DEFAULT_DESKTOP_SETTINGS)) {
    if (typeof settings[key] === "boolean") {
      normalized[key] = settings[key];
    }
  }

  return normalized;
}

function loadDesktopSettings(filePath) {
  try {
    return normalizePersistedDesktopSettings(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") {
      return { ...DEFAULT_DESKTOP_SETTINGS };
    }

    if (error instanceof SyntaxError) {
      return { ...DEFAULT_DESKTOP_SETTINGS };
    }

    throw error;
  }
}

function saveDesktopSettings(filePath, settings) {
  const currentSettings = loadDesktopSettings(filePath);
  const nextSettings = {
    ...currentSettings,
    ...normalizeDesktopSettings(settings, { allowPartial: true })
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(nextSettings, null, 2), "utf8");
  return nextSettings;
}

module.exports = {
  DEFAULT_DESKTOP_SETTINGS,
  InvalidDesktopSettingsError,
  loadDesktopSettings,
  normalizeDesktopSettings,
  normalizePersistedDesktopSettings,
  saveDesktopSettings
};
