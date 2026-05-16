# skill 管理器桌面版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 `skill 管理器` 网页应用包装成 Windows 桌面软件，提供主窗口、系统托盘、可选开机自启动、免安装版和安装版。

**Architecture:** 保留现有 Node.js 本地服务作为业务核心，新增一层 Tauri 桌面壳负责窗口、托盘、自启动和打包。桌面壳启动时拉起本地服务，WebView 加载本地页面，并通过新增的桌面设置接口与页面联动。

**Tech Stack:** Node.js 内置模块、Tauri 2、Rust、Tauri 插件（autostart、shell、fs、dialog）、原生 HTML/CSS/JavaScript

---

### Task 1: 把本地服务整理成可被桌面壳托管的形态

**Files:**
- Modify: `src/server.js`
- Create: `src/app-context.js`
- Create: `src/desktop-settings.js`
- Create: `tests/app-context.test.js`
- Modify: `tests/server.test.js`

- [ ] **Step 1: 先写失败测试，固定桌面模式下的配置与设置持久化行为**

```js
// tests/app-context.test.js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests\\app-context.test.js tests\\server.test.js`
Expected: FAIL with `Cannot find module '../src/app-context'`

- [ ] **Step 3: 实现桌面运行上下文与设置存储**

```js
// src/app-context.js
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
```

```js
// src/desktop-settings.js
const fs = require("node:fs");

function loadDesktopSettings(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return { launchAtStartup: false, minimizeToTrayOnClose: true };
    }
    throw error;
  }
}

function saveDesktopSettings(filePath, settings) {
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf8");
}

module.exports = { loadDesktopSettings, saveDesktopSettings };
```

- [ ] **Step 4: 给服务加桌面设置接口与参数化启动入口**

```js
// src/server.js
const { createAppContext } = require("./app-context");
const { loadDesktopSettings, saveDesktopSettings } = require("./desktop-settings");

function createSkillServer({ manager, staticDir = path.join(__dirname, "static"), desktopSettingsPath = null }) {
  // ...
  if (request.method === "GET" && url.pathname === "/api/desktop/settings") {
    sendJson(response, 200, {
      settings: desktopSettingsPath ? loadDesktopSettings(desktopSettingsPath) : null
    });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/desktop/settings") {
    const body = await readRequestBody(request);
    const payload = body ? JSON.parse(body) : {};
    saveDesktopSettings(desktopSettingsPath, payload);
    sendJson(response, 200, { settings: payload });
    return;
  }
}
```

- [ ] **Step 5: 再跑一遍测试确认通过**

Run: `node --test tests\\app-context.test.js tests\\server.test.js`
Expected: PASS with `0 fail`

### Task 2: 给页面补桌面设置区与托盘相关状态展示

**Files:**
- Modify: `src/static/index.html`
- Modify: `src/static/app.js`
- Modify: `src/static/styles.css`
- Modify: `tests/server.test.js`

- [ ] **Step 1: 先写失败测试，固定桌面设置区文案和 API 接入**

```js
// tests/server.test.js
const appResponse = await readText(`${baseUrl}/`);
assert.match(appResponse.text, /桌面设置/);
assert.match(appResponse.text, /开机自启动/);

const scriptResponse = await readText(`${baseUrl}/app.js`);
assert.match(scriptResponse.text, /\/api\/desktop\/settings/);
assert.match(scriptResponse.text, /最小化到托盘/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests\\server.test.js`
Expected: FAIL because the page does not contain `桌面设置`

- [ ] **Step 3: 在页面结构里加入桌面设置卡片**

```html
<!-- src/static/index.html -->
<section class="description-block">
  <h3>桌面设置</h3>
  <label class="toggle-row">
    <span>开机自启动</span>
    <input id="launch-at-startup" type="checkbox">
  </label>
  <label class="toggle-row">
    <span>关闭窗口时最小化到托盘</span>
    <input id="minimize-to-tray" type="checkbox" checked>
  </label>
  <p id="desktop-data-path" class="muted"></p>
</section>
```

- [ ] **Step 4: 在脚本中加载并保存桌面设置**

```js
// src/static/app.js
async function loadDesktopSettings() {
  const response = await fetch("/api/desktop/settings");
  const payload = await response.json();
  return payload.settings;
}

async function saveDesktopSettings(settings) {
  await fetch("/api/desktop/settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(settings)
  });
}
```

```js
// src/static/app.js
elements.launchAtStartup.addEventListener("change", async () => {
  await saveDesktopSettings({
    ...state.desktopSettings,
    launchAtStartup: elements.launchAtStartup.checked
  });
});
```

- [ ] **Step 5: 运行测试确认页面和脚本都通过**

Run: `node --test tests\\server.test.js`
Expected: PASS with `0 fail`

### Task 3: 搭建 Tauri 桌面壳并让它托管本地服务

**Files:**
- Create: `desktop/src-tauri/Cargo.toml`
- Create: `desktop/src-tauri/tauri.conf.json`
- Create: `desktop/src-tauri/build.rs`
- Create: `desktop/src-tauri/src/main.rs`
- Create: `desktop/src-tauri/src/lib.rs`
- Create: `desktop/package.json`
- Create: `desktop/icons/app-icon.png`

- [ ] **Step 1: 先写最小桌面壳配置骨架**

```json
// desktop/package.json
{
  "name": "skill-manager-desktop",
  "private": true,
  "scripts": {
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0"
  }
}
```

```toml
# desktop/src-tauri/Cargo.toml
[package]
name = "skill-manager-desktop"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-autostart = "2"
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 2: 先把主窗口与托盘菜单跑起来**

```rust
// desktop/src-tauri/src/main.rs
fn main() {
    skill_manager_desktop_lib::run();
}
```

```rust
// desktop/src-tauri/src/lib.rs
use tauri::{Manager, menu::{Menu, MenuItem}, tray::TrayIconBuilder};

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出软件", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            TrayIconBuilder::new().menu(&menu).build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run tauri app");
}
```

- [ ] **Step 3: 在 Tauri 启动时拉起本地 Node 服务**

```rust
// desktop/src-tauri/src/lib.rs
use std::process::{Child, Command};
use std::sync::Mutex;

struct ServerState(Mutex<Option<Child>>);

fn start_server(app_dir: &std::path::Path) -> Child {
    Command::new("node")
        .arg("src/server.js")
        .current_dir(app_dir)
        .env("PORT", "3211")
        .spawn()
        .expect("failed to spawn local server")
}
```

- [ ] **Step 4: 让窗口加载本地服务地址，并处理关闭到托盘**

```json
// desktop/src-tauri/tauri.conf.json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "skill 管理器",
  "version": "0.1.0",
  "identifier": "com.codex.skill-manager",
  "app": {
    "windows": [
      {
        "title": "skill 管理器",
        "width": 1440,
        "height": 920,
        "url": "http://127.0.0.1:3211"
      }
    ]
  }
}
```

```rust
// desktop/src-tauri/src/lib.rs
.on_window_event(|window, event| {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
    }
})
```

- [ ] **Step 5: 运行桌面开发模式确认窗口能打开**

Run: `npm --prefix desktop run tauri:dev`
Expected: 桌面窗口打开，并加载 `skill 管理器` 页面

### Task 4: 接通开机自启动与托盘操作

**Files:**
- Modify: `desktop/src-tauri/src/lib.rs`
- Modify: `src/static/app.js`
- Modify: `src/server.js`

- [ ] **Step 1: 在 Rust 层接入自启动插件并暴露命令**

```rust
// desktop/src-tauri/src/lib.rs
#[tauri::command]
fn set_launch_at_startup(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|e| e.to_string())
    } else {
        manager.disable().map_err(|e| e.to_string())
    }
}
```

- [ ] **Step 2: 托盘菜单补齐显示、隐藏和退出逻辑**

```rust
// desktop/src-tauri/src/lib.rs
.on_menu_event(|app, event| {
    match event.id().as_ref() {
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "quit" => app.exit(0),
        _ => {}
    }
})
```

- [ ] **Step 3: 页面里通过 Tauri 命令同步自启动开关**

```js
// src/static/app.js
async function setDesktopAutostart(enabled) {
  if (!window.__TAURI__?.core?.invoke) {
    return;
  }
  await window.__TAURI__.core.invoke("set_launch_at_startup", { enabled });
}
```

- [ ] **Step 4: 同步保存桌面设置文件和原生自启动状态**

```js
// src/static/app.js
elements.launchAtStartup.addEventListener("change", async () => {
  const enabled = elements.launchAtStartup.checked;
  await setDesktopAutostart(enabled);
  await saveDesktopSettings({
    ...state.desktopSettings,
    launchAtStartup: enabled
  });
});
```

- [ ] **Step 5: 手工验证托盘和自启动开关**

Run: `npm --prefix desktop run tauri:dev`
Expected:
- 关闭窗口后程序仍在托盘
- 托盘菜单可以恢复窗口
- 自启动开关切换后无报错

### Task 5: 输出免安装版与安装版

**Files:**
- Modify: `desktop/src-tauri/tauri.conf.json`
- Modify: `desktop/package.json`
- Modify: `README.md`

- [ ] **Step 1: 配置打包产物和应用元数据**

```json
// desktop/src-tauri/tauri.conf.json
{
  "bundle": {
    "active": true,
    "targets": ["nsis", "updater"],
    "windows": {
      "digestAlgorithm": "sha256"
    }
  }
}
```

- [ ] **Step 2: 增加桌面打包命令**

```json
// desktop/package.json
{
  "scripts": {
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "desktop:bundle": "tauri build"
  }
}
```

- [ ] **Step 3: 更新 README，补充桌面运行和产物路径说明**

```md
## 桌面版开发

```bash
npm --prefix desktop run tauri:dev
```

## 桌面版打包

```bash
npm --prefix desktop run tauri:build
```

产物位于 `desktop/src-tauri/target/release/bundle/`
```

- [ ] **Step 4: 执行打包命令**

Run: `npm --prefix desktop run tauri:build`
Expected: 生成免安装版和安装版产物

- [ ] **Step 5: 验证最终交付**

Run:
- `node --test`
- `npm --prefix desktop run tauri:build`

Expected:
- Node 测试全部通过
- 桌面包构建成功
- 免安装版和安装版都存在于打包目录
