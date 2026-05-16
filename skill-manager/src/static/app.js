const DEFAULT_DESKTOP_SETTINGS = {
  launchAtStartup: false,
  minimizeToTrayOnClose: true
};

const DEFAULT_LOCAL_DATA_PATH = "data/desktop-settings.json";

const state = {
  skills: [],
  activity: [],
  summary: {},
  group: "all",
  query: "",
  showMissing: false,
  selectedSkillId: null,
  desktopSettings: null,
  localDataPath: DEFAULT_LOCAL_DATA_PATH
};

const elements = {
  summary: document.getElementById("summary"),
  groupList: document.getElementById("group-list"),
  activityList: document.getElementById("activity-list"),
  skillList: document.getElementById("skill-list"),
  searchInput: document.getElementById("search-input"),
  showMissing: document.getElementById("show-missing"),
  detailEmpty: document.getElementById("detail-empty"),
  detailView: document.getElementById("detail-view"),
  detailGroup: document.getElementById("detail-group"),
  detailName: document.getElementById("detail-name"),
  detailStatus: document.getElementById("detail-status"),
  detailPath: document.getElementById("detail-path"),
  detailFirstSeen: document.getElementById("detail-first-seen"),
  detailLastSeen: document.getElementById("detail-last-seen"),
  detailLastChanged: document.getElementById("detail-last-changed"),
  detailAutoDescription: document.getElementById("detail-auto-description"),
  overrideInput: document.getElementById("override-input"),
  saveOverride: document.getElementById("save-override"),
  clearOverride: document.getElementById("clear-override"),
  saveMessage: document.getElementById("save-message"),
  launchAtStartup: document.getElementById("launch-at-startup"),
  minimizeToTray: document.getElementById("minimize-to-tray"),
  desktopSettingsStatus: document.getElementById("desktop-settings-status"),
  desktopDataPath: document.getElementById("desktop-data-path")
};

function formatDate(value) {
  if (!value) {
    return "未记录";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function groupLabel(group) {
  return {
    all: "全部",
    user: "用户安装",
    system: "系统",
    plugin: "插件"
  }[group] || group;
}

function statusLabel(status) {
  return status === "missing" ? "缺失" : "正常";
}

function activityLabel(type) {
  return {
    "skill-discovered": "发现新 skill",
    "skill-updated": "skill 内容已更新",
    "skill-missing": "skill 已移除",
    "description-overridden": "手动说明已更新"
  }[type] || "状态已变化";
}

function filterSkills() {
  const query = state.query.trim().toLowerCase();
  return state.skills.filter((skill) => {
    if (!state.showMissing && skill.status === "missing") {
      return false;
    }
    if (state.group !== "all" && skill.group !== state.group) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [skill.name, skill.description, skill.autoDescription, skill.path]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });
}

function renderSummary() {
  const cards = [
    { label: "总数", value: state.summary.total || 0 },
    { label: "用户", value: state.summary.user || 0 },
    { label: "系统", value: state.summary.system || 0 },
    { label: "插件", value: state.summary.plugin || 0 }
  ];

  elements.summary.innerHTML = cards.map((card) => `
    <div class="stat-card">
      <span>${card.label}</span>
      <strong>${card.value}</strong>
    </div>
  `).join("");
}

function renderGroups() {
  const groups = [
    { id: "all", label: "全部", count: state.summary.total || 0 },
    { id: "user", label: "用户安装", count: state.summary.user || 0 },
    { id: "system", label: "系统", count: state.summary.system || 0 },
    { id: "plugin", label: "插件", count: state.summary.plugin || 0 }
  ];

  elements.groupList.innerHTML = groups.map((group) => `
    <button class="group-button ${state.group === group.id ? "active" : ""}" data-group="${group.id}">
      <span>${group.label}</span>
      <strong>${group.count}</strong>
    </button>
  `).join("");

  for (const button of elements.groupList.querySelectorAll("[data-group]")) {
    button.addEventListener("click", () => {
      state.group = button.dataset.group;
      renderSkills();
      renderGroups();
    });
  }
}

function renderActivity() {
  const items = state.activity.slice(0, 8);
  if (items.length === 0) {
    elements.activityList.innerHTML = `<p class="muted">还没有活动记录</p>`;
    return;
  }

  elements.activityList.innerHTML = items.map((item) => `
    <div class="activity-item">
      <strong>${item.name || item.skillId}</strong>
      <span>${activityLabel(item.type)}</span>
      <small>${formatDate(item.timestamp)}</small>
    </div>
  `).join("");
}

function renderSkills() {
  const skills = filterSkills();
  if (skills.length === 0) {
    elements.skillList.innerHTML = `<p class="muted">没有符合条件的 skill</p>`;
    return;
  }

  elements.skillList.innerHTML = skills.map((skill) => `
    <button class="skill-card ${state.selectedSkillId === skill.id ? "selected" : ""}" data-skill-id="${skill.id}">
      <div class="skill-card-top">
        <strong>${skill.name}</strong>
        <span class="chip ${skill.status === "missing" ? "chip-muted" : ""}">${groupLabel(skill.group)}</span>
      </div>
      <p>${skill.description}</p>
      <div class="skill-card-meta">
        <span>${statusLabel(skill.status)}</span>
        <span>${skill.overrideDescription ? "手动覆盖" : "自动简介"}</span>
      </div>
    </button>
  `).join("");

  for (const button of elements.skillList.querySelectorAll("[data-skill-id]")) {
    button.addEventListener("click", () => {
      state.selectedSkillId = button.dataset.skillId;
      renderSkills();
      renderDetail();
    });
  }

  if (!state.selectedSkillId && skills[0]) {
    state.selectedSkillId = skills[0].id;
    renderSkills();
    renderDetail();
  }
}

function renderDetail() {
  const skill = state.skills.find((item) => item.id === state.selectedSkillId);
  if (!skill) {
    elements.detailEmpty.classList.remove("hidden");
    elements.detailView.classList.add("hidden");
    return;
  }

  elements.detailEmpty.classList.add("hidden");
  elements.detailView.classList.remove("hidden");
  elements.detailGroup.textContent = groupLabel(skill.group);
  elements.detailName.textContent = skill.name;
  elements.detailStatus.textContent = statusLabel(skill.status);
  elements.detailPath.textContent = skill.path;
  elements.detailFirstSeen.textContent = formatDate(skill.firstSeenAt);
  elements.detailLastSeen.textContent = formatDate(skill.lastSeenAt);
  elements.detailLastChanged.textContent = formatDate(skill.lastChangedAt);
  elements.detailAutoDescription.textContent = skill.autoDescription;
  elements.overrideInput.value = skill.overrideDescription || "";
  elements.saveMessage.textContent = "";
}

function renderDesktopSettings(message) {
  const available = Boolean(state.desktopSettings);
  const settings = available ? state.desktopSettings : DEFAULT_DESKTOP_SETTINGS;

  elements.launchAtStartup.disabled = !available;
  elements.minimizeToTray.disabled = !available;
  elements.launchAtStartup.checked = settings.launchAtStartup;
  elements.minimizeToTray.checked = settings.minimizeToTrayOnClose;
  elements.desktopSettingsStatus.textContent = message || (
    available
      ? "桌面设置已连接，可立即保存。"
      : "当前为网页模式，请在桌面版中启用这些设置。"
  );
  elements.desktopDataPath.textContent = `本地数据位置：${state.localDataPath}`;
}

async function loadDesktopSettings() {
  const response = await fetch("/api/desktop/settings");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "桌面设置加载失败");
  }

  state.desktopSettings = payload.settings;
  state.localDataPath = payload.settings ? DEFAULT_LOCAL_DATA_PATH : "data/";
  renderDesktopSettings();
}

async function saveDesktopSettings(nextSettings) {
  const response = await fetch("/api/desktop/settings", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(nextSettings)
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "桌面设置保存失败");
  }

  state.desktopSettings = payload.settings;
  state.localDataPath = payload.settings ? DEFAULT_LOCAL_DATA_PATH : "data/";
  renderDesktopSettings(payload.settings ? "桌面设置已保存。" : undefined);
}

async function setDesktopAutostart(enabled) {
  if (!window.__TAURI__?.core?.invoke) {
    return;
  }

  await window.__TAURI__.core.invoke("set_launch_at_startup", { enabled });
}

async function loadData() {
  const [skillsResponse, activityResponse] = await Promise.all([
    fetch("/api/skills").then((response) => response.json()),
    fetch("/api/activity").then((response) => response.json())
  ]);

  state.skills = skillsResponse.skills;
  state.summary = skillsResponse.summary;
  state.activity = activityResponse.activity;
  renderSummary();
  renderGroups();
  renderActivity();
  renderSkills();
  renderDetail();
}

async function saveOverride(description) {
  if (!state.selectedSkillId) {
    return;
  }

  const response = await fetch(`/api/skills/${encodeURIComponent(state.selectedSkillId)}/override`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ description })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "保存失败");
  }

  elements.saveMessage.textContent = "已保存";
  await loadData();
}

function bindDesktopToggle(element, key) {
  element.addEventListener("change", async () => {
    if (!state.desktopSettings) {
      renderDesktopSettings();
      return;
    }

    const nextSettings = {
      ...state.desktopSettings,
      [key]: element.checked
    };

    state.desktopSettings = nextSettings;
    renderDesktopSettings("正在保存桌面设置...");

    try {
      if (key === "launchAtStartup") {
        await setDesktopAutostart(element.checked);
      }
      await saveDesktopSettings(nextSettings);
    } catch (error) {
      elements.desktopSettingsStatus.textContent = error.message;
      await loadDesktopSettings();
    }
  });
}

function bindEvents() {
  elements.searchInput.addEventListener("input", () => {
    state.query = elements.searchInput.value;
    renderSkills();
  });

  elements.showMissing.addEventListener("change", () => {
    state.showMissing = elements.showMissing.checked;
    renderSkills();
  });

  elements.saveOverride.addEventListener("click", async () => {
    try {
      await saveOverride(elements.overrideInput.value);
    } catch (error) {
      elements.saveMessage.textContent = error.message;
    }
  });

  elements.clearOverride.addEventListener("click", async () => {
    try {
      await saveOverride("");
    } catch (error) {
      elements.saveMessage.textContent = error.message;
    }
  });

  bindDesktopToggle(elements.launchAtStartup, "launchAtStartup");
  bindDesktopToggle(elements.minimizeToTray, "minimizeToTrayOnClose");

  const stream = new EventSource("/api/stream");
  stream.addEventListener("message", async () => {
    await loadData();
  });
}

async function initialize() {
  try {
    await Promise.all([
      loadData(),
      loadDesktopSettings()
    ]);
  } catch (error) {
    elements.saveMessage.textContent = error.message;
  }
}

bindEvents();
renderDesktopSettings();
initialize();
