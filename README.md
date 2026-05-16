

# skill 管理器

一个给 Codex 用户使用的本地 skill 管理工具。它可以自动扫描你已经安装的 skill，记录新增和变更，并为每个 skill 提供中文说明，让你不用在一堆 `SKILL.md` 里翻来翻去。

## 核心功能

- 自动扫描用户 skill、系统 skill 和插件缓存中的 skill。
- 实时记录新增、修改、缺失的 skill。
- 自动生成中文简介，skill 名称保持原样。
- 支持手动编辑每个 skill 的说明。
- 展示 skill 来源路径、更新时间、状态和活动记录。
- 提供网页模式和 Windows 桌面版。
- 桌面版支持托盘菜单、关闭隐藏到后台、开机自启动开关。
- 后台服务静默运行，不弹出黑色终端窗口。

## 下载与安装

Windows 用户请进入本仓库右侧的 `Releases` 页面，下载最新版安装包：

```text
skill 管理器_0.1.0_x64-setup.exe
下载后双击运行安装程序。安装完成后，可以从桌面或开始菜单打开：

skill 管理器
当前安装包未进行代码签名，Windows 可能会出现安全提醒。确认来源可信后，选择“更多信息”，再选择“仍要运行”即可。

本地网页模式
如果你只想在浏览器里运行：

npm install
npm start
默认访问地址：

http://127.0.0.1:3210
桌面版开发
桌面端位于 desktop/，使用 Tauri 2 承载本地 Node.js 服务。

npm install
npm.cmd --prefix desktop install
npm.cmd --prefix desktop run tauri:dev
桌面版会自动启动本地服务并加载：

http://127.0.0.1:3211
构建 Windows 安装包
构建前需要安装：

Node.js
Rust 工具链
Visual Studio Build Tools，包含 MSVC 和 Windows SDK
Microsoft Edge WebView2 Runtime
构建命令：

npm.cmd --prefix desktop run tauri:build
安装包输出目录：

desktop/src-tauri/target/release/bundle/nsis/
技术栈
Node.js
原生 HTML/CSS/JavaScript
Tauri 2
Rust
Windows NSIS Installer
Node.js Test Runner
测试
node --test tests/*.test.js
项目状态
当前版本：0.1.0

已支持 Windows x64 桌面安装包。后续可以继续扩展多语言、搜索过滤、图标主题、更多平台打包和自动更新。
