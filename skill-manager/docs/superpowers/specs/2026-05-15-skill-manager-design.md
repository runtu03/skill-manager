# Skill 管理器设计文档

**日期：** 2026-05-15  
**目标：** 提供一个本地网页界面，实时监测 Codex 已安装的 skill，并为每个 skill 展示可读简介，支持手动补充或覆盖说明。

## 需求范围

本次实现聚焦以下能力：

- 监测 Codex 当前可用的全部 skill
- 按 `系统 skill`、`插件 skill`、`用户安装 skill` 分组展示
- 自动提取每个 skill 的介绍文字
- 允许用户手动编辑并覆盖介绍文字
- 在本地保留 skill 首次发现、最近扫描、最近变更等记录
- 对新增、删除、修改进行实时监测，并用活动记录展示

不在本次范围内：

- 直接安装、卸载 skill
- 远程同步到云端
- 多用户账户体系
- 打包为桌面安装程序

## 数据来源

Skill 数据从本机目录读取：

- 用户安装 skill：`C:\Users\admin\.codex\skills\*`
- 系统 skill：`C:\Users\admin\.codex\skills\.system\*`
- 插件 skill：`C:\Users\admin\.codex\plugins\cache\**\skills\*\SKILL.md`

识别原则：

- 目录中存在 `SKILL.md` 才视为一个 skill
- `C:\Users\admin\.codex\skills\.system\` 下归类为系统 skill
- `C:\Users\admin\.codex\skills\` 下除 `.system` 外的一级目录归类为用户安装 skill
- 插件缓存目录下 `skills` 子目录中的 skill 归类为插件 skill

## 简介生成规则

每个 skill 的展示简介按以下优先级生成：

1. 用户手动覆盖的介绍
2. `SKILL.md` frontmatter 中的 `description`
3. `SKILL.md` 正文第一段可读文本
4. 默认兜底文案：`暂无简介`

页面中同时保留：

- 自动提取简介
- 手动覆盖简介

展示时优先显示手动覆盖简介，并明确标识来源。

## 实时监测方案

实时监测采用“双轨制”：

- 文件监听：使用本地文件系统监听，尽快捕获新增、删除、修改
- 定时全量扫描：周期性校准，避免单纯依赖监听导致漏记

系统为每个 skill 维护：

- `firstSeenAt`
- `lastSeenAt`
- `lastChangedAt`
- `status`，例如 `active`、`missing`

活动记录至少包含：

- 新发现 skill
- skill 文件被修改
- skill 消失
- 手动简介被更新

## 页面结构

页面采用三栏管理器布局：

- 左侧：分组切换与计数
- 中间：skill 列表、搜索、筛选、简介摘要
- 右侧：skill 详情，包括路径、分组、自动简介、手动简介、时间记录

顶部显示总览：

- skill 总数
- 各分组数量
- 最近活动摘要

## 本地存储

应用目录内保存本地数据文件：

- `data/skill-state.json`：skill 历史状态与活动记录
- `data/overrides.json`：手动覆盖简介

这样即使关闭服务，重新打开后也能保留记录。

## 后端与前端

后端采用原生 Node.js 本地 HTTP 服务，负责：

- 扫描与监听 skill 目录
- 提供 JSON API
- 保存状态与覆盖文案
- 提供静态网页资源

前端采用原生 HTML/CSS/JavaScript，负责：

- 分组展示
- 搜索与详情查看
- 活动记录展示
- 手动编辑简介并保存

## 验证标准

以下条件成立即视为完成：

- 页面能展示当前全部已发现 skill
- 分组正确，系统 / 插件 / 用户安装三类能区分
- 新增一个 skill 后，页面会自动出现并生成记录
- 修改或删除 skill 后，页面状态会同步更新
- 每个 skill 都能显示简介
- 手动编辑简介后，刷新页面仍能保留

## 规格自检

- 无占位符或待定项
- 范围聚焦在“发现、记录、介绍、展示”
- 实时监测与持久化方案没有冲突
- 页面结构、数据来源、展示规则已明确
