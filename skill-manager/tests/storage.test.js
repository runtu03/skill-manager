const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { JsonFileStore } = require("../src/storage");

test("JsonFileStore persists overrides and state across instances", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-store-"));
  const storeA = new JsonFileStore(root);

  storeA.saveOverrides({
    "user:alpha": "Hand written intro"
  });
  storeA.saveState({
    skills: {
      "user:alpha": {
        id: "user:alpha",
        status: "active"
      }
    },
    activity: [{ type: "skill-discovered", skillId: "user:alpha" }]
  });

  const storeB = new JsonFileStore(root);

  assert.deepEqual(storeB.loadOverrides(), {
    "user:alpha": "Hand written intro"
  });
  assert.deepEqual(storeB.loadState(), {
    skills: {
      "user:alpha": {
        id: "user:alpha",
        status: "active"
      }
    },
    activity: [{ type: "skill-discovered", skillId: "user:alpha" }]
  });
});
