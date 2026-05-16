const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { localizeDescription } = require("./description-localizer");
const { parseSkillMarkdown } = require("./skill-parser");
const { JsonFileStore } = require("./storage");

function hashContent(content) {
  return crypto.createHash("sha1").update(content).digest("hex");
}

function safeReadDirectory(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function scanSimpleRoot(rootDir, group) {
  return safeReadDirectory(rootDir)
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(rootDir, entry.name))
    .filter((skillDir) => fs.existsSync(path.join(skillDir, "SKILL.md")))
    .map((skillDir) => ({ group, skillDir }));
}

function scanPluginCache(pluginCacheDir) {
  const results = [];

  function walk(currentDir) {
    for (const entry of safeReadDirectory(currentDir)) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name === "SKILL.md") {
        const segments = fullPath.split(path.sep);
        const skillsIndex = segments.lastIndexOf("skills");
        if (skillsIndex > 2 && skillsIndex < segments.length - 1) {
          results.push({
            group: "plugin",
            skillDir: path.dirname(fullPath)
          });
        }
      }
    }
  }

  walk(pluginCacheDir);
  return results;
}

function sortSkills(skills) {
  return [...skills].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "active" ? -1 : 1;
    }
    if (left.group !== right.group) {
      return left.group.localeCompare(right.group);
    }
    return left.name.localeCompare(right.name);
  });
}

class SkillManager {
  constructor({
    userSkillsDir,
    systemSkillsDir,
    pluginCacheDir,
    dataDir,
    now = () => new Date().toISOString(),
    store
  }) {
    this.userSkillsDir = userSkillsDir;
    this.systemSkillsDir = systemSkillsDir;
    this.pluginCacheDir = pluginCacheDir;
    this.now = now;
    this.store = store || new JsonFileStore(dataDir);
    const initialState = this.store.loadState();
    this.skillsById = initialState.skills || {};
    this.activity = initialState.activity || [];
    this.overrides = this.store.loadOverrides();
    this.watchers = [];
    this.listeners = new Set();
    this.refreshTimer = null;
    this.rescanInterval = null;
  }

  discoverSkillEntries() {
    return [
      ...scanSimpleRoot(this.userSkillsDir, "user"),
      ...scanSimpleRoot(this.systemSkillsDir, "system"),
      ...scanPluginCache(this.pluginCacheDir)
    ];
  }

  buildSkillRecord(group, skillDir) {
    const markdown = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
    const parsed = parseSkillMarkdown(markdown, skillDir);
    const relativePluginParts = skillDir.split(path.sep);
    let id = `${group}:${path.basename(skillDir)}`;

    if (group === "plugin") {
      const skillsIndex = relativePluginParts.lastIndexOf("skills");
      const pluginName = relativePluginParts[skillsIndex - 2];
      const skillParts = relativePluginParts.slice(skillsIndex + 1);
      id = `plugin:${pluginName}:${skillParts.join(":")}`;
    }

    const localizedAutoDescription = localizeDescription(id, parsed.name, parsed.sourceDescription);

    return {
      id,
      name: parsed.name,
      group,
      path: skillDir,
      autoDescription: localizedAutoDescription,
      sourceDescription: parsed.sourceDescription,
      sourceHash: hashContent(markdown)
    };
  }

  pushActivity(entry) {
    this.activity.unshift(entry);
    this.activity = this.activity.slice(0, 100);
  }

  persist() {
    this.store.saveState({
      skills: this.skillsById,
      activity: this.activity
    });
    this.store.saveOverrides(this.overrides);
  }

  refresh() {
    const timestamp = this.now();
    const discovered = this.discoverSkillEntries();
    const nextIds = new Set();
    const nextSkillsById = { ...this.skillsById };

    for (const entry of discovered) {
      const current = this.buildSkillRecord(entry.group, entry.skillDir);
      const previous = this.skillsById[current.id];
      nextIds.add(current.id);

      if (!previous) {
        nextSkillsById[current.id] = {
          ...current,
          firstSeenAt: timestamp,
          lastSeenAt: timestamp,
          lastChangedAt: timestamp,
          status: "active"
        };
        this.pushActivity({
          type: "skill-discovered",
          skillId: current.id,
          name: current.name,
          timestamp
        });
        continue;
      }

      const changed = previous.sourceHash !== current.sourceHash;
      nextSkillsById[current.id] = {
        ...previous,
        ...current,
        lastSeenAt: timestamp,
        status: "active",
        lastChangedAt: changed ? timestamp : previous.lastChangedAt
      };

      if (changed) {
        this.pushActivity({
          type: "skill-updated",
          skillId: current.id,
          name: current.name,
          timestamp
        });
      }
    }

    for (const [skillId, previous] of Object.entries(this.skillsById)) {
      if (nextIds.has(skillId)) {
        continue;
      }

      if (previous.status !== "missing") {
        nextSkillsById[skillId] = {
          ...previous,
          status: "missing"
        };
        this.pushActivity({
          type: "skill-missing",
          skillId,
          name: previous.name,
          timestamp
        });
      }
    }

    this.skillsById = nextSkillsById;
    this.persist();
    this.emitChange();
  }

  setOverride(skillId, description) {
    const cleanText = (description || "").trim();
    if (!this.skillsById[skillId]) {
      return null;
    }

    if (cleanText) {
      this.overrides[skillId] = cleanText;
    } else {
      delete this.overrides[skillId];
    }

    this.pushActivity({
      type: "description-overridden",
      skillId,
      name: this.skillsById[skillId].name,
      timestamp: this.now()
    });
    this.persist();
    this.emitChange();
    return this.getSkill(skillId);
  }

  getSkill(skillId) {
    const skill = this.skillsById[skillId];
    if (!skill) {
      return null;
    }

    const overrideDescription = this.overrides[skillId] || "";
    return {
      ...skill,
      overrideDescription,
      description: overrideDescription || skill.autoDescription
    };
  }

  getSkills() {
    return sortSkills(Object.keys(this.skillsById).map((skillId) => this.getSkill(skillId)));
  }

  getActivity() {
    return [...this.activity];
  }

  getSummary() {
    const summary = {
      total: 0,
      user: 0,
      system: 0,
      plugin: 0,
      missing: 0
    };

    for (const skill of this.getSkills()) {
      if (skill.status === "active") {
        summary.total += 1;
        summary[skill.group] += 1;
      } else {
        summary.missing += 1;
      }
    }

    return summary;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  startWatching() {
    if (this.watchers.length > 0) {
      return;
    }

    const watchDirs = [this.userSkillsDir, this.systemSkillsDir, this.pluginCacheDir]
      .filter(Boolean)
      .filter((dirPath) => fs.existsSync(dirPath));

    const triggerRefresh = () => {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => {
        this.refresh();
      }, 300);
    };

    for (const dirPath of watchDirs) {
      try {
        const watcher = fs.watch(dirPath, { recursive: true }, triggerRefresh);
        this.watchers.push(watcher);
      } catch (error) {
        if (error.code !== "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM") {
          throw error;
        }
      }
    }

    this.rescanInterval = setInterval(() => {
      this.refresh();
    }, 5000);
  }

  close() {
    clearTimeout(this.refreshTimer);
    clearInterval(this.rescanInterval);
    this.rescanInterval = null;
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
  }
}

module.exports = {
  SkillManager
};
