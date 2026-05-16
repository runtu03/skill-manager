const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { SkillManager } = require("../src/skill-manager");

function writeSkill(dir, content) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), content, "utf8");
}

function createPaths(root) {
  return {
    userSkillsDir: path.join(root, "codex", "skills"),
    systemSkillsDir: path.join(root, "codex", "skills", ".system"),
    pluginCacheDir: path.join(root, "codex", "plugins", "cache"),
    dataDir: path.join(root, "data")
  };
}

test("SkillManager discovers user, system, and plugin skills with descriptions", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-manager-"));
  const paths = createPaths(root);

  writeSkill(
    path.join(paths.userSkillsDir, "alpha"),
    `---
name: alpha
description: Alpha description
---

# Alpha
`
  );

  writeSkill(
    path.join(paths.systemSkillsDir, "imagegen"),
    `---
name: imagegen
description: System image skill
---
`
  );

  writeSkill(
    path.join(paths.pluginCacheDir, "vendor", "plugin-a", "1.0.0", "skills", "browser"),
    `# Browser Skill

Open and inspect local web pages.
`
  );

  const manager = new SkillManager({
    ...paths,
    now: () => "2026-05-15T10:00:00.000Z"
  });

  manager.refresh();
  const skills = manager.getSkills();

  assert.equal(skills.length, 3);

  const alpha = skills.find((skill) => skill.id === "user:alpha");
  assert.deepEqual(
    {
      name: alpha.name,
      group: alpha.group,
      autoDescription: alpha.autoDescription,
      description: alpha.description,
      status: alpha.status
    },
    {
      name: "alpha",
      group: "user",
      autoDescription: "用于处理与 alpha 相关的任务，具体能力可查看该 skill 的原始说明。",
      description: "用于处理与 alpha 相关的任务，具体能力可查看该 skill 的原始说明。",
      status: "active"
    }
  );

  const system = skills.find((skill) => skill.id === "system:imagegen");
  assert.equal(system.group, "system");

  const plugin = skills.find((skill) => skill.id === "plugin:plugin-a:browser");
  assert.equal(plugin.group, "plugin");
  assert.equal(plugin.autoDescription, "用于处理与 browser 相关的任务，具体能力可查看该 skill 的原始说明。");
});

test("SkillManager localizes known skill auto descriptions into Chinese", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-localized-"));
  const paths = createPaths(root);

  writeSkill(
    path.join(paths.userSkillsDir, "test-driven-development"),
    `---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---
`
  );

  const manager = new SkillManager({
    ...paths,
    now: () => "2026-05-16T09:00:00.000Z"
  });

  manager.refresh();
  const skill = manager.getSkills().find((entry) => entry.id === "user:test-driven-development");

  assert.equal(skill.autoDescription, "适用于实现新功能或修复缺陷前，先写失败测试再编写最小实现。");
  assert.equal(skill.description, "适用于实现新功能或修复缺陷前，先写失败测试再编写最小实现。");
  assert.equal(skill.sourceDescription, "Use when implementing any feature or bugfix, before writing implementation code");
});

test("SkillManager keeps history and records new, changed, and missing skills", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-history-"));
  const paths = createPaths(root);

  writeSkill(
    path.join(paths.userSkillsDir, "alpha"),
    `---
name: alpha
description: First version
---
`
  );

  const timestamps = [
    "2026-05-15T10:00:00.000Z",
    "2026-05-15T10:05:00.000Z",
    "2026-05-15T10:10:00.000Z"
  ];

  const manager = new SkillManager({
    ...paths,
    now: () => timestamps.shift()
  });

  manager.refresh();
  fs.writeFileSync(
    path.join(paths.userSkillsDir, "alpha", "SKILL.md"),
    `---
name: alpha
description: Second version
---
`,
    "utf8"
  );
  manager.refresh();
  fs.rmSync(path.join(paths.userSkillsDir, "alpha"), { recursive: true, force: true });
  manager.refresh();

  const skill = manager.getSkills().find((entry) => entry.id === "user:alpha");
  assert.equal(skill.firstSeenAt, "2026-05-15T10:00:00.000Z");
  assert.equal(skill.lastChangedAt, "2026-05-15T10:05:00.000Z");
  assert.equal(skill.lastSeenAt, "2026-05-15T10:05:00.000Z");
  assert.equal(skill.status, "missing");

  const activityTypes = manager.getActivity().map((entry) => entry.type);
  assert.deepEqual(activityTypes, [
    "skill-missing",
    "skill-updated",
    "skill-discovered"
  ]);
});
