# skill 管理器

`skill 管理器` 是一个本地 Codex skill 管理工具，用来查看、理解和管理电脑中已经安装的 Codex skill。它会自动扫描本地 skill，记录新增、修改和缺失状态，并为每个 skill 提供中文简介，方便用户快速判断什么时候该使用哪个 skill。

这个项目既可以作为本地网页工具运行，也可以打包成 Windows 桌面软件使用。

## 项目亮点

- 自动扫描本机已安装的 Codex skill。
- 支持用户 skill、系统 skill 和插件缓存 skill。
- 为每个 skill 自动生成中文简介。
- skill 名称保持原样，方便和 Codex 中的 skill 对应。
- 记录 skill 的新增、修改、缺失等状态变化。
- 支持手动编辑和覆盖 skill 简介。
- 展示 skill 来源路径、更新时间和活动记录。
- 提供 Windows 桌面版安装包。
- 桌面版支持托盘菜单、关闭隐藏到后台和开机自启动。
- 后台服务静默运行，不弹出黑色终端窗口。

## 下载与安装

Windows 用户请进入本项目 GitHub 仓库右侧的 `Releases` 页面，下载最新版安装包：

```text
skill 管理器_0.1.0_x64-setup.exe
```

下载后双击运行安装程序。安装完成后，可以从桌面或开始菜单打开：

```text
skill 管理器
```

如果 Windows 出现安全提醒，请选择：

```text
更多信息 -> 仍要运行
```

> 当前安装包未进行代码签名，因此 Windows 可能会提示未知发布者。这是未签名个人项目的常见情况。

## 软件界面

打开软件后，页面会展示：

- skill 总数量。
- 当前已安装的 skill 列表。
- 每个 skill 的中文简介。
- skill 的来源类型。
- skill 的本地路径。
- 最近扫描时间。
- 最近变更记录。
- 手动编辑简介入口。
- 桌面版设置入口。

## 使用说明

安装并打开 `skill 管理器` 后，软件会自动扫描本机 Codex skill。

如果后续你新增、删除或修改 skill，软件会自动记录变化，并在活动记录中展示。

如果某个 skill 的自动简介不够准确，可以在界面中手动编辑说明。手动编辑后的简介会被保存，后续扫描不会覆盖你的自定义内容。

## 本地网页模式

如果你不想安装桌面版，也可以直接运行网页模式。

### 安装依赖

```powershell
npm install
```

### 启动服务

```powershell
npm start
```

默认访问地址：

```text
http://127.0.0.1:3210
```

## 桌面版开发模式

桌面版位于 `desktop/` 目录，使用 Tauri 2 承载本地 Node.js 服务。

### 安装桌面端依赖

```powershell
npm.cmd --prefix desktop install
```

### 启动桌面开发版

```powershell
npm.cmd --prefix desktop run tauri:dev
```

桌面版默认会启动本地服务：

```text
http://127.0.0.1:3211
```

## 构建 Windows 安装包

构建 Windows 安装包前，需要安装以下环境：

- Node.js
- Rust 工具链
- Visual Studio Build Tools
- Microsoft Edge WebView2 Runtime

构建命令：

```powershell
npm.cmd --prefix desktop run tauri:build
```

构建完成后，安装包会输出到：

```text
desktop/src-tauri/target/release/bundle/nsis/
```

安装包名称示例：

```text
skill 管理器_0.1.0_x64-setup.exe
```

## 技术栈

- Node.js
- 原生 HTML
- 原生 CSS
- 原生 JavaScript
- Rust
- Tauri 2
- NSIS Installer
- Node.js Test Runner

## 项目结构

```text
skill-manager/
├─ src/
│  ├─ server.js
│  ├─ skill-manager.js
│  ├─ skill-parser.js
│  ├─ storage.js
│  └─ static/
│     ├─ index.html
│     ├─ app.js
│     └─ styles.css
├─ desktop/
│  ├─ package.json
│  └─ src-tauri/
│     ├─ Cargo.toml
│     ├─ tauri.conf.json
│     └─ src/
│        ├─ main.rs
│        └─ lib.rs
├─ tests/
├─ docs/
├─ package.json
└─ README.md
```

## 测试

运行测试：

```powershell
node --test tests/*.test.js
```

当前项目测试覆盖：

- skill 扫描。
- skill 中文简介生成。
- skill 状态记录。
- 本地存储。
- HTTP API。
- 静态资源访问。
- 桌面设置接口。

## 版本信息

当前版本：

```text
0.1.0
```

当前版本支持：

```text
Windows x64
```

## 注意事项

- 本项目主要面向 Codex 用户。
- 软件读取的是本机 Codex skill 目录。
- 当前安装包未代码签名。
- 首次运行时 Windows 可能显示安全提醒。
