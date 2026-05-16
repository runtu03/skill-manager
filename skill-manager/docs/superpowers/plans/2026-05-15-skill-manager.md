# Skill 管理器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个本地网页版 skill 管理器，实时监测 Codex skill，分组展示，并支持简介自动提取与手动覆盖。

**Architecture:** 使用原生 Node.js 实现一个本地 HTTP 服务，负责扫描 skill 目录、监听变化、持久化状态并暴露 JSON API。前端使用原生 HTML/CSS/JavaScript 构建单页管理界面，通过 API 拉取 skill 列表与活动记录，并保存手动简介覆盖。

**Tech Stack:** Node.js 内置模块（`http`、`fs`、`path`、`url`、`node:test`）、原生 HTML/CSS/JavaScript

---

### Task 1: 项目骨架

**Files:**
- Create: `package.json`
- Create: `src/server.js`
- Create: `src/skill-registry.js`
- Create: `src/storage.js`
- Create: `src/skill-parser.js`
- Create: `src/static/index.html`
- Create: `src/static/app.js`
- Create: `src/static/styles.css`
- Create: `tests/skill-registry.test.js`
- Create: `tests/storage.test.js`
- Create: `tests/server.test.js`

- [ ] Step 1: 先写失败测试，定义扫描、分类、简介提取和状态持久化行为
- [ ] Step 2: 运行测试确认失败
- [ ] Step 3: 实现最小后端模块让测试通过
- [ ] Step 4: 补上 HTTP API 与静态页面输出
- [ ] Step 5: 再次运行测试确认通过

### Task 2: Skill 扫描与实时监测

**Files:**
- Modify: `src/skill-registry.js`
- Modify: `tests/skill-registry.test.js`

- [ ] Step 1: 为用户、系统、插件 skill 写分类与发现测试
- [ ] Step 2: 为新增、删除、修改的状态变化写测试
- [ ] Step 3: 实现全量扫描
- [ ] Step 4: 实现文件监听与重新扫描触发
- [ ] Step 5: 确认活动记录生成

### Task 3: 简介覆盖与接口

**Files:**
- Modify: `src/storage.js`
- Modify: `src/server.js`
- Modify: `tests/storage.test.js`
- Modify: `tests/server.test.js`

- [ ] Step 1: 为手动简介覆盖保存和读取写测试
- [ ] Step 2: 为 `GET /api/skills`、`GET /api/activity`、`POST /api/skills/:id/override` 写测试
- [ ] Step 3: 实现数据接口
- [ ] Step 4: 确认刷新后覆盖简介仍保留

### Task 4: 网页管理界面

**Files:**
- Modify: `src/static/index.html`
- Modify: `src/static/app.js`
- Modify: `src/static/styles.css`

- [ ] Step 1: 实现三栏布局与顶部总览
- [ ] Step 2: 接入 skill 列表、活动记录、详情面板
- [ ] Step 3: 实现搜索与分组切换
- [ ] Step 4: 实现手动简介编辑与保存
- [ ] Step 5: 实现自动刷新或轮询更新

### Task 5: 验证与交付

**Files:**
- Modify: `README.md`

- [ ] Step 1: 写运行说明
- [ ] Step 2: 运行全部测试
- [ ] Step 3: 本地启动服务做一次手工验证
- [ ] Step 4: 记录剩余风险与后续可扩展点
