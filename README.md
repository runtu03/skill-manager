skill 管理器
skill 管理器 是一个本地 Codex skill 管理工具，用来查看当前安装的 skill、中文简介、来源路径和变更记录。它支持网页模式，也提供 Windows 桌面版安装包。

功能
自动扫描用户、系统和插件来源的 Codex skill。
记录后续新增、删除、修改的 skill。
为每个 skill 提供中文简介，支持手动编辑覆盖。
实时监听 skill 文件变化并刷新列表。
桌面版支持独立窗口、托盘菜单、关闭隐藏到后台、开机自启动开关。
下载安装
Windows 用户请到本项目 GitHub 页面右侧的 Releases，下载最新版安装包：

skill 管理器_0.1.0_x64-setup.exe
双击安装后，从桌面或开始菜单打开 skill 管理器 即可。

说明：当前安装包未做代码签名，Windows 可能会出现安全提醒。选择“更多信息”，再选择“仍要运行”即可。

本地网页模式
npm install
npm start
默认访问地址：

http://127.0.0.1:3210
桌面版开发
桌面版位于 desktop/，使用 Tauri 承载本地服务。

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
安装包输出位置：

desktop/src-tauri/target/release/bundle/nsis/
技术栈
Node.js HTTP 服务
原生 HTML/CSS/JavaScript 前端
Tauri 2 桌面壳
Rust 桌面进程管理
Windows NSIS 安装包
Node.js Test Runner 自动化测试
测试
node --test tests/*.test.js
