# skill 管理器项目完整文档

文档日期：2026-05-16  
项目名称：skill 管理器  
项目类型：本地 Web 应用 + Windows 桌面应用  
目标用户：需要查看、监测、理解和管理 Codex skills 的本机用户

## 1. 项目概述

`skill 管理器` 是一个面向 Codex 本地 skill 的管理工具。它会扫描当前机器上 Codex 已安装的 skill，并按来源分为用户安装、系统内置、插件附带三类展示。

项目最初是本地网页应用，后续增加了 Tauri 桌面壳，最终支持：

- 实时监测 Codex skill 的新增、修改、删除。
- 按 `用户安装 / 系统 / 插件` 分组展示 skill。
- 自动读取 `SKILL.md`，提取 skill 名称和说明。
- 将自动简介转换为中文说明。
- 允许用户手动覆盖每个 skill 的简介。
- 保存首次发现时间、最近扫描时间、最近变更时间。
- 保存活动记录。
- 提供本地网页界面。
- 提供 Windows 桌面软件。
- 支持托盘菜单。
- 支持关闭窗口后隐藏到托盘。
- 支持开机自启动开关。
- 输出免安装版 `.exe` 和安装版安装程序。

## 2. 当前交付状态

当前项目已经完成：

- Web 版服务与页面。
- 桌面版 Tauri 外壳。
- Windows 安装包。
- Windows 免安装可执行文件。
- 桌面快捷方式安装。
- 自动扫描和实时监听。
- 中文自动简介。
- 手动覆盖简介。
- 桌面设置接口。
- 桌面设置页面。
- 托盘显示、隐藏、退出。
- 开机自启动原生命令接入。
- 测试覆盖。

当前已生成的交付产物：

- 免安装版：`desktop/src-tauri/target/release/skill-manager-desktop.exe`
- 安装版：`desktop/src-tauri/target/release/bundle/nsis/skill 管理器_0.1.0_x64-setup.exe`
- 已安装位置：`C:\Users\admin\AppData\Local\skill 管理器\skill-manager-desktop.exe`
- 桌面快捷方式：`C:\Users\admin\Desktop\skill 管理器.lnk`

最终验证记录：

- Node 测试：`22` 个测试全部通过。
- `cargo check`：通过。
- `tauri build`：成功。
- 免安装 exe：成功生成。
- NSIS 安装包：成功生成。
- 已安装桌面程序运行验证：`HTTP 200`，当前识别到 `34` 个 skill。

## 3. 技术栈

### 3.1 后端技术栈

- Node.js：本地 HTTP 服务、文件扫描、文件监听、JSON 存储。
- Node 内置模块：
  - `node:http`：提供本地 HTTP API 和静态文件服务。
  - `node:fs`：读取 skill 文件、保存状态、监听目录变化。
  - `node:path`：处理跨目录路径。
  - `node:os`：获取用户主目录。
  - `node:url`：解析请求 URL。
  - `node:crypto`：计算 `SKILL.md` 内容哈希。
- Node Test Runner：使用 `node --test` 编写和运行测试。

项目后端没有引入 Express、Koa 等 Web 框架，整体是轻量级本地服务。

### 3.2 前端技术栈

- HTML5：页面结构。
- CSS3：布局、主题、响应式样式。
- 原生 JavaScript：状态管理、API 请求、页面渲染、事件绑定。
- Server-Sent Events：通过 `/api/stream` 接收后端变更通知。

前端没有使用 React、Vue、Svelte 等框架，便于作为本地工具保持简单和可维护。

### 3.3 桌面端技术栈

- Tauri 2：Windows 桌面壳。
- Rust 2021 Edition：Tauri 原生层逻辑。
- Cargo：Rust 依赖管理和构建。
- Tauri 插件：
  - `tauri-plugin-autostart`：开机自启动。
  - `tauri-plugin-shell`：桌面壳扩展能力。
- NSIS：Windows 安装包输出。
- WebView2：Windows WebView 运行环境。
- Visual Studio Build Tools：Windows 编译工具链，包含 MSVC 和 Windows SDK。

### 3.4 构建与运行工具

- `npm.cmd`：Windows 下运行 npm 脚本。
- `@tauri-apps/cli`：Tauri CLI。
- `rustup`：Rust 工具链安装。
- `cargo` / `rustc`：Rust 构建。
- `VsDevCmd.bat`：注入 MSVC 编译环境。

## 4. 系统架构

整体架构分为三层：

```text
Windows 桌面壳 Tauri
        |
        | 启动 node src/server.js
        v
Node.js 本地服务
        |
        | 提供 API / 静态页面 / SSE
        v
HTML + CSS + JavaScript Web UI
```

### 4.1 Web 模式

Web 模式直接运行：

```powershell
node src/server.js
```

默认监听：

```text
http://127.0.0.1:3210
```

Web 模式主要用于开发、调试和浏览器访问。

### 4.2 桌面模式

桌面模式由 Tauri 启动：

```text
skill-manager-desktop.exe
```

桌面壳会启动：

```powershell
node src/server.js
```

并注入环境变量：

```text
APP_MODE=desktop
APP_DATA_DIR=<Tauri app data dir>
PORT=3211
```

桌面窗口加载：

```text
http://127.0.0.1:3211
```

### 4.3 数据流

```text
Codex skill 目录
        |
        v
SkillManager 扫描 SKILL.md
        |
        v
解析 frontmatter / 正文第一段
        |
        v
中文简介本地化
        |
        v
保存状态与活动记录
        |
        v
HTTP API 返回给前端
        |
        v
页面渲染列表、详情、活动、设置
```

## 5. 目录结构

核心目录如下：

```text
skill-1-codex-skill-skill-2/
  package.json
  README.md
  data/
    skill-state.json
    overrides.json
  docs/
    PROJECT_DOCUMENTATION.md
    superpowers/
      plans/
      specs/
  src/
    app-context.js
    description-localizer.js
    desktop-settings.js
    server.js
    skill-manager.js
    skill-parser.js
    storage.js
    static/
      index.html
      app.js
      styles.css
  tests/
    app-context.test.js
    server.test.js
    skill-manager.test.js
    storage.test.js
  desktop/
    package.json
    package-lock.json
    icons/
      app-icon.png
    src-tauri/
      Cargo.toml
      Cargo.lock
      build.rs
      tauri.conf.json
      capabilities/
        default.json
      icons/
        icon.ico
      src/
        main.rs
        lib.rs
      target/
        release/
        release/bundle/nsis/
```

## 6. 后端模块说明

### 6.1 `src/server.js`

项目后端入口。

职责：

- 创建 HTTP 服务。
- 提供 skill API。
- 提供活动记录 API。
- 提供桌面设置 API。
- 提供 SSE 实时更新流。
- 提供静态页面服务。
- 在 CLI 模式下启动 `SkillManager`。
- 在桌面模式下读取 `APP_MODE`、`APP_DATA_DIR`、`PORT`。

关键能力：

- `GET /api/skills`：返回 skill 列表和汇总。
- `GET /api/activity`：返回活动记录。
- `GET /api/stream`：返回 SSE 事件流。
- `GET /api/desktop/settings`：读取桌面设置。
- `POST /api/desktop/settings`：保存桌面设置。
- `POST /api/skills/:id/override`：保存指定 skill 的手动说明。
- 静态资源安全校验，防止路径穿越。
- 请求体大小限制：`1MB`。
- JSON 解析错误返回 `400`。
- 超大请求体返回 `413`。
- 非法手动简介 payload 返回 `400`。

### 6.2 `src/skill-manager.js`

skill 扫描和状态管理核心。

职责：

- 扫描用户 skill。
- 扫描系统 skill。
- 扫描插件 skill。
- 读取每个 skill 的 `SKILL.md`。
- 生成 skill 唯一 ID。
- 判断新增、修改、缺失。
- 保存活动记录。
- 应用手动覆盖说明。
- 向前端推送变更事件。
- 通过 `fs.watch` 监听目录变化。
- 通过定时全量扫描兜底，避免漏掉变化。

扫描来源：

```text
用户 skill：C:\Users\admin\.codex\skills
系统 skill：C:\Users\admin\.codex\skills\.system
插件 skill：C:\Users\admin\.codex\plugins\cache
```

skill 分组：

- `user`：用户安装。
- `system`：系统内置。
- `plugin`：插件附带。

skill 状态：

- `active`：当前存在。
- `missing`：历史存在过，但当前文件已删除或不可见。

### 6.3 `src/skill-parser.js`

`SKILL.md` 解析模块。

职责：

- 解析 YAML 风格 frontmatter。
- 读取 `name` 字段。
- 读取 `description` 字段。
- 如果没有 `description`，提取正文第一段作为说明。
- 如果没有 `name`，使用 skill 目录名作为名称。

解析优先级：

```text
frontmatter.description
正文第一段
兜底说明
```

### 6.4 `src/description-localizer.js`

中文简介生成模块。

职责：

- 对已知 skill 生成定制中文简介。
- 对未知 skill 生成中文兜底简介。
- 避免直接把英文说明暴露给用户。

说明优先级：

```text
手动覆盖简介
中文自动简介
原始说明
兜底说明
```

### 6.5 `src/storage.js`

JSON 文件存储模块。

职责：

- 确保数据目录存在。
- 读取状态文件。
- 保存状态文件。
- 读取手动覆盖说明。
- 保存手动覆盖说明。

数据文件：

```text
data/skill-state.json
data/overrides.json
```

### 6.6 `src/app-context.js`

运行上下文模块。

职责：

- 生成运行模式。
- 生成 host。
- 生成 port。
- 生成数据目录。
- 生成桌面设置文件路径。

模式：

- `browser`：本地网页模式。
- `desktop`：桌面软件模式。

### 6.7 `src/desktop-settings.js`

桌面设置存储与校验模块。

职责：

- 定义默认桌面设置。
- 读取 `desktop-settings.json`。
- 保存 `desktop-settings.json`。
- 校验设置 payload。
- 对损坏的本地设置文件做容错恢复。
- 支持部分更新。

当前设置项：

```json
{
  "launchAtStartup": false,
  "minimizeToTrayOnClose": true
}
```

## 7. 前端模块说明

### 7.1 `src/static/index.html`

页面结构。

主要区域：

- 顶部汇总区。
- 左侧分组区。
- 左侧最近活动区。
- 中间 skill 列表。
- 搜索框。
- 显示缺失 skill 开关。
- 右侧 skill 详情。
- 自动简介区。
- 手动覆盖简介区。
- 桌面设置区。

### 7.2 `src/static/app.js`

前端逻辑。

职责：

- 请求后端 API。
- 渲染 skill 汇总。
- 渲染分组按钮。
- 渲染 skill 列表。
- 渲染 skill 详情。
- 渲染活动记录。
- 搜索过滤。
- 是否显示缺失 skill。
- 保存手动覆盖简介。
- 加载桌面设置。
- 保存桌面设置。
- 调用 Tauri 原生命令 `set_launch_at_startup`。
- 监听 SSE 自动刷新。

前端状态：

```js
{
  skills: [],
  activity: [],
  summary: {},
  group: "all",
  query: "",
  showMissing: false,
  selectedSkillId: null,
  desktopSettings: null,
  localDataPath: "data/desktop-settings.json"
}
```

### 7.3 `src/static/styles.css`

页面样式。

特点：

- 三栏管理器布局。
- 左侧分组与活动记录。
- 中间 skill 卡片列表。
- 右侧详情面板。
- 响应式布局，小屏幕下切换为单列。
- 桌面设置卡片。
- 统一的按钮、开关、卡片和状态徽标样式。

## 8. 桌面端模块说明

### 8.1 `desktop/src-tauri/src/main.rs`

Tauri 程序入口。

职责：

```rust
fn main() {
    skill_manager_desktop_lib::run();
}
```

### 8.2 `desktop/src-tauri/src/lib.rs`

桌面壳核心逻辑。

职责：

- 启动 Tauri 应用。
- 找到打包资源目录或开发项目目录。
- 启动 Node 本地服务。
- 注入桌面模式环境变量。
- 创建托盘菜单。
- 处理托盘菜单事件。
- 处理窗口关闭事件。
- 注册开机自启动命令。
- 应用退出时关闭子进程。

启动服务时使用：

```text
APP_MODE=desktop
APP_DATA_DIR=<app data dir>
PORT=3211
```

托盘菜单：

- 显示窗口。
- 隐藏窗口。
- 退出软件。

窗口行为：

- 点击关闭按钮时不直接退出。
- 阻止关闭事件。
- 隐藏窗口到托盘。
- 从托盘可恢复窗口。

原生命令：

```text
set_launch_at_startup(enabled: bool)
```

前端通过：

```js
window.__TAURI__.core.invoke("set_launch_at_startup", { enabled })
```

### 8.3 `desktop/src-tauri/tauri.conf.json`

Tauri 配置文件。

主要配置：

- 产品名：`skill 管理器`
- 版本：`0.1.0`
- 标识符：`com.codex.skill-manager`
- 主窗口标题：`skill 管理器`
- 主窗口大小：`1440 x 920`
- 最小窗口大小：`980 x 720`
- 窗口加载地址：`http://127.0.0.1:3211`
- 启用 `withGlobalTauri`
- 打包目标：`nsis`
- 图标：PNG 与 ICO。
- 打包资源：`src/` 与根 `package.json`。

### 8.4 `desktop/src-tauri/Cargo.toml`

Rust 依赖配置。

主要依赖：

- `tauri = "2"`：桌面应用框架。
- `tauri-plugin-autostart = "2"`：开机自启动。
- `tauri-plugin-shell = "2"`：Tauri shell 插件。
- `serde = "1"`：序列化。
- `serde_json = "1"`：JSON 支持。
- `tauri-build = "2"`：Tauri 构建脚本。

### 8.5 `desktop/package.json`

桌面端 npm 脚本。

```json
{
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build",
  "desktop:bundle": "tauri build"
}
```

## 9. HTTP API 文档

### 9.1 获取 skill 列表

```http
GET /api/skills
```

返回：

```json
{
  "skills": [],
  "summary": {
    "total": 34,
    "user": 25,
    "system": 5,
    "plugin": 4,
    "missing": 0
  }
}
```

skill 字段：

- `id`：唯一 ID。
- `name`：skill 名称。
- `group`：`user`、`system`、`plugin`。
- `path`：本地路径。
- `autoDescription`：自动中文简介。
- `overrideDescription`：手动覆盖简介。
- `description`：最终展示简介。
- `firstSeenAt`：首次发现时间。
- `lastSeenAt`：最近扫描时间。
- `lastChangedAt`：最近变更时间。
- `status`：`active` 或 `missing`。

### 9.2 获取活动记录

```http
GET /api/activity
```

返回：

```json
{
  "activity": []
}
```

活动类型：

- `skill-discovered`：发现新 skill。
- `skill-updated`：skill 内容更新。
- `skill-missing`：skill 已移除。
- `description-overridden`：手动简介已更新。

### 9.3 实时事件流

```http
GET /api/stream
```

返回类型：

```text
text/event-stream
```

用途：

- 当后端扫描到 skill 变化时通知前端。
- 前端收到消息后重新加载数据。

### 9.4 保存手动简介

```http
POST /api/skills/:id/override
Content-Type: application/json
```

请求：

```json
{
  "description": "用户自定义简介"
}
```

说明：

- `description` 必须是字符串。
- 空字符串表示清空覆盖。
- 非法 JSON 返回 `400`。
- 非字符串说明返回 `400`。
- 未找到 skill 返回 `404`。
- 请求体超过 `1MB` 返回 `413`。

### 9.5 获取桌面设置

```http
GET /api/desktop/settings
```

桌面模式返回：

```json
{
  "settings": {
    "launchAtStartup": false,
    "minimizeToTrayOnClose": true
  }
}
```

网页模式返回：

```json
{
  "settings": null
}
```

### 9.6 保存桌面设置

```http
POST /api/desktop/settings
Content-Type: application/json
```

请求：

```json
{
  "launchAtStartup": true,
  "minimizeToTrayOnClose": true
}
```

说明：

- 支持部分更新。
- 只允许已定义的布尔字段。
- 非法字段返回 `400`。
- 非法 JSON 返回 `400`。
- 请求体超过 `1MB` 返回 `413`。

## 10. 数据文件

### 10.1 `data/skill-state.json`

保存 skill 状态和活动记录。

主要内容：

```json
{
  "skills": {},
  "activity": []
}
```

用途：

- 保存已发现 skill。
- 保存每个 skill 的时间信息。
- 保存缺失状态。
- 保存最近活动。

### 10.2 `data/overrides.json`

保存用户手动覆盖简介。

结构：

```json
{
  "skill-id": "用户手动填写的简介"
}
```

### 10.3 `desktop-settings.json`

桌面设置文件。

结构：

```json
{
  "launchAtStartup": false,
  "minimizeToTrayOnClose": true
}
```

桌面版使用 Tauri 应用数据目录保存该文件。网页模式不启用桌面设置写入。

## 11. skill 扫描规则

### 11.1 用户 skill

扫描目录：

```text
C:\Users\admin\.codex\skills
```

规则：

- 只扫描包含 `SKILL.md` 的一级子目录。
- 分组为 `user`。
- ID 格式：`user:<目录名>`。

### 11.2 系统 skill

扫描目录：

```text
C:\Users\admin\.codex\skills\.system
```

规则：

- 只扫描包含 `SKILL.md` 的一级子目录。
- 分组为 `system`。
- ID 格式：`system:<目录名>`。

### 11.3 插件 skill

扫描目录：

```text
C:\Users\admin\.codex\plugins\cache
```

规则：

- 递归扫描所有 `SKILL.md`。
- 只识别位于插件 `skills` 目录下的 skill。
- 分组为 `plugin`。
- ID 格式：`plugin:<插件名>:<skill路径>`。

## 12. 实时监测机制

项目使用两层机制保证实时性：

### 12.1 文件系统监听

使用：

```js
fs.watch(dirPath, { recursive: true }, triggerRefresh)
```

监听目录：

- 用户 skill 目录。
- 系统 skill 目录。
- 插件缓存目录。

当文件变化时，后端延迟 `300ms` 触发刷新，避免频繁重复扫描。

### 12.2 定时兜底扫描

除文件监听外，还使用定时扫描作为兜底，避免部分系统或文件变更场景漏掉事件。

### 12.3 前端自动刷新

后端变化后向 `/api/stream` 的 SSE 客户端发送事件。

前端收到事件后执行：

```js
await loadData();
```

## 13. 安全与健壮性设计

当前项目包含以下保护：

- 静态文件路径使用 `path.resolve` 和 `path.relative` 校验，防止路径穿越。
- POST 请求体限制为 `1MB`。
- JSON 解析失败返回 `400`。
- 桌面设置字段严格校验。
- 手动简介字段类型严格校验。
- 桌面设置文件损坏时恢复默认值。
- 桌面设置部分字段损坏时保留可用字段。
- 写入设置前自动创建父目录。
- 桌面进程退出时尝试关闭 Node 子进程。

## 14. 运行方式

### 14.1 Web 版运行

```powershell
cd C:\Users\admin\Documents\Codex\2026-05-15\skill-1-codex-skill-skill-2
node src/server.js
```

打开：

```text
http://127.0.0.1:3210
```

### 14.2 桌面版开发运行

```powershell
cd C:\Users\admin\Documents\Codex\2026-05-15\skill-1-codex-skill-skill-2
npm.cmd --prefix desktop install
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
npm.cmd --prefix desktop run tauri:dev
```

如果需要完整 MSVC 环境：

```powershell
cmd /c ""%USERPROFILE%\VSBuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && npm.cmd --prefix desktop run tauri:dev"
```

### 14.3 桌面版打包

```powershell
cd C:\Users\admin\Documents\Codex\2026-05-15\skill-1-codex-skill-skill-2
cmd /c ""%USERPROFILE%\VSBuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && npm.cmd --prefix desktop run tauri:build"
```

输出：

```text
desktop/src-tauri/target/release/skill-manager-desktop.exe
desktop/src-tauri/target/release/bundle/nsis/skill 管理器_0.1.0_x64-setup.exe
```

## 15. 安装方式

### 15.1 使用安装包

运行：

```text
desktop/src-tauri/target/release/bundle/nsis/skill 管理器_0.1.0_x64-setup.exe
```

当前已安装到：

```text
C:\Users\admin\AppData\Local\skill 管理器\skill-manager-desktop.exe
```

桌面快捷方式：

```text
C:\Users\admin\Desktop\skill 管理器.lnk
```

### 15.2 使用免安装版

直接运行：

```text
desktop/src-tauri/target/release/skill-manager-desktop.exe
```

## 16. 测试

### 16.1 运行全部 Node 测试

```powershell
node --test tests\app-context.test.js tests\server.test.js tests\skill-manager.test.js tests\storage.test.js
```

当前结果：

```text
22 pass
0 fail
```

### 16.2 Rust 编译检查

```powershell
cmd /c ""%USERPROFILE%\VSBuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && "%USERPROFILE%\.cargo\bin\cargo.exe" check --manifest-path desktop\src-tauri\Cargo.toml"
```

当前结果：通过。

### 16.3 桌面构建

```powershell
cmd /c ""%USERPROFILE%\VSBuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && npm.cmd --prefix desktop run tauri:build"
```

当前结果：成功生成 exe 和 NSIS 安装包。

### 16.4 已安装程序运行验证

验证方式：

1. 启动已安装程序。
2. 访问 `http://127.0.0.1:3211/api/skills`。
3. 检查返回状态和 skill 统计。

当前验证结果：

```text
HTTP 200
Total 34
```

## 17. 构建环境要求

### 17.1 必需环境

- Windows 10 或 Windows 11。
- Node.js。
- npm。
- Rust 工具链。
- Cargo。
- WebView2 Runtime。
- Visual Studio Build Tools。
- MSVC C++ 工具链。
- Windows SDK。

### 17.2 当前机器状态

当前机器已经安装：

- Node.js `24.15.0`
- npm `11.12.1`
- Rust `1.95.0`
- Cargo `1.95.0`
- Visual Studio Build Tools `2022`
- WebView2 Runtime
- Tauri CLI `2.11.1`

### 17.3 注意事项

Windows PowerShell 直接运行 `npm` 可能被执行策略拦截。推荐使用：

```powershell
npm.cmd
```

Tauri 编译前建议通过 `VsDevCmd.bat` 注入 MSVC 环境。

## 18. 当前已知注意事项

### 18.1 桌面程序依赖系统 Node

当前 Tauri 桌面壳通过系统命令启动：

```text
node src/server.js
```

因此安装后的机器需要可用的 Node.js。当前机器已经安装 Node，所以程序运行正常。

后续如果希望安装包在没有 Node 的电脑上也能运行，可以考虑：

- 将 Node runtime 一并打包。
- 使用 Rust 重写本地服务层。
- 使用单文件 Node 打包工具生成内置服务可执行文件。

### 18.2 PowerShell 中文显示

部分 PowerShell 输出可能把 UTF-8 中文显示为乱码。这通常是终端编码显示问题，不代表浏览器页面或文件内容一定损坏。

### 18.3 当前只面向 Windows

桌面打包只完成 Windows 版本。macOS 和 Linux 不在当前范围内。

## 19. 维护建议

### 19.1 新增 skill 来源

如果未来 Codex 新增其他 skill 存放路径，应修改：

```text
src/skill-manager.js
```

重点关注：

- `discoverSkillEntries`
- `scanSimpleRoot`
- `scanPluginCache`

### 19.2 新增桌面设置项

需要同步修改：

- `src/desktop-settings.js`
- `src/server.js`
- `src/static/index.html`
- `src/static/app.js`
- `tests/server.test.js`

### 19.3 新增 API

建议同步补充：

- 请求参数校验。
- 错误响应。
- 请求体大小限制。
- Node 测试。
- 本文档。

### 19.4 修改 Tauri 能力

需要同步检查：

- `desktop/src-tauri/src/lib.rs`
- `desktop/src-tauri/tauri.conf.json`
- `desktop/src-tauri/capabilities/default.json`

## 20. 版本与产物

当前版本：

```text
Web 项目版本：1.0.0
桌面项目版本：0.1.0
Tauri 产品名：skill 管理器
Tauri identifier：com.codex.skill-manager
```

当前产物：

```text
免安装版：
desktop/src-tauri/target/release/skill-manager-desktop.exe

安装版：
desktop/src-tauri/target/release/bundle/nsis/skill 管理器_0.1.0_x64-setup.exe
```

当前安装结果：

```text
安装目录：
C:\Users\admin\AppData\Local\skill 管理器

桌面快捷方式：
C:\Users\admin\Desktop\skill 管理器.lnk
```

## 21. 项目总结

`skill 管理器` 当前已经从本地网页工具扩展为可安装的 Windows 桌面软件。它的核心价值是把 Codex 的 skill 状态透明化：用户可以看到有哪些 skill、skill 来自哪里、何时出现或变化、每个 skill 能做什么，并且可以用中文说明维护自己的使用理解。

技术上，项目采用了轻量 Node 后端、原生 HTML/CSS/JavaScript 前端、Tauri 2 桌面壳的组合。这个组合保留了 Web UI 的开发效率，也获得了桌面窗口、托盘、安装包和开机自启动等原生能力。
