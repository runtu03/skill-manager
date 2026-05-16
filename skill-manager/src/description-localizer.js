const LOCALIZED_DESCRIPTIONS = {
  "plugin:spreadsheets:spreadsheets": "用于创建、修改、分析和可视化电子表格文件，支持公式、格式、图表、表格和重新计算。",
  "plugin:browser-use:browser": "用于在 Codex 内置浏览器中打开、导航、检查、测试、点击、输入、截图并验证本地或网页目标。",
  "plugin:documents:documents": "用于在容器内创建、编辑、审阅和批注 .docx 文件，并通过渲染校验流程保证版式正确。",
  "plugin:presentations:presentations": "用于制作高质量的分析型 PPTX 演示文稿，强调叙事打磨、图表表达和迭代优化。",
  "system:imagegen": "用于生成或编辑位图图像，例如照片、插画、贴图、精灵图、草图和透明背景素材。",
  "system:openai-docs": "用于查询 OpenAI 产品和 API 的最新官方文档，帮助选型、升级模型和编写提示词。",
  "system:plugin-creator": "用于为 Codex 创建和搭建本地插件目录结构，包含必需配置文件和可选骨架文件。",
  "system:skill-creator": "用于指导创建或更新高质量 skill，使其扩展 Codex 的能力和工作流程。",
  "system:skill-installer": "用于把精选 skill 或 GitHub 仓库中的 skill 安装到 $CODEX_HOME/skills。",
  "user:playwright-interactive": "用于通过持久浏览器会话快速进行浏览器和 Electron 界面的交互式调试。",
  "user:brainstorming": "适用于在实现前设计新功能、规划特性、构思组件和明确需求边界。",
  "user:defuddle": "用于从网页中提取干净的 Markdown 内容，去除导航和杂项信息以节省上下文。",
  "user:dispatching-parallel-agents": "适用于把多个彼此独立的任务并行拆分给不同代理处理。",
  "user:docx": "用于创建、编辑和分析专业 .docx 文档，支持修订、批注、格式保留和文本提取。",
  "user:executing-plans": "适用于根据现成的实施计划分步骤执行任务，并在关键点进行检查。",
  "user:finishing-a-development-branch": "适用于功能完成后整理分支、收尾验证、准备合并或交接。",
  "user:json-canvas": "用于创建和编辑 JSON Canvas 文件，支持节点、连线、分组以及可视化关系组织。",
  "user:markitdown": "用于把多种文件和办公文档转换为 Markdown，支持 PDF、DOCX、PPTX、XLSX、图片、音频等。",
  "user:obsidian-bases": "用于创建和编辑 Obsidian Bases 文件，配置视图、筛选、公式和摘要。",
  "user:obsidian-cli": "用于通过 Obsidian CLI 读写笔记、搜索内容、管理任务与属性，并支持插件和主题调试。",
  "user:obsidian-markdown": "用于创建和编辑 Obsidian 风格 Markdown，支持 wikilink、嵌入、callout、属性和标签等语法。",
  "user:pdf": "用于处理 PDF 的提取、生成、拆分、合并、表格处理和表单填写等任务。",
  "user:pptx": "用于创建、编辑和分析演示文稿，支持页面布局、内容修改、批注和备注处理。",
  "user:receiving-code-review": "适用于接收、评估和回应代码评审意见、修改建议和技术质疑。",
  "user:requesting-code-review": "适用于完成任务后请求独立代码评审，或在合并前检查实现质量。",
  "user:subagent-driven-development": "适用于按照实施计划把独立任务分派给子代理并在当前会话中推进开发。",
  "user:systematic-debugging": "适用于遇到缺陷、测试失败或异常行为时，先按系统化流程定位问题。",
  "user:test-driven-development": "适用于实现新功能或修复缺陷前，先写失败测试再编写最小实现。",
  "user:using-git-worktrees": "适用于需要工作区隔离、并行分支开发或执行独立计划时使用 git worktree。",
  "user:Using-Superpowers": "适用于每次开始任务前检查是否有合适的 skill，并按要求加载相应流程。",
  "user:verification-before-completion": "适用于准备宣称任务完成、测试通过或可交付前，先执行正式验证。",
  "user:writing-plans": "适用于在动手编码前，把规格拆解成清晰、可执行的实施计划。",
  "user:writing-skills": "适用于创建、编辑和验证 Codex skill，并在部署前检查其可用性。",
  "user:xlsx": "用于创建、编辑和分析电子表格，支持公式、格式、数据分析、可视化和重算。"
};

function stripWrappingQuotes(text) {
  const trimmed = (text || "").trim();
  return trimmed.replace(/^"(.*)"$/s, "$1");
}

function containsChinese(text) {
  return /[\u3400-\u9fff]/.test(text);
}

function localizeDescription(skillId, skillName, sourceDescription) {
  const cleanSource = stripWrappingQuotes(sourceDescription);

  if (!cleanSource) {
    return `用于处理与 ${skillName} 相关的任务。`;
  }

  if (containsChinese(cleanSource)) {
    return cleanSource;
  }

  if (LOCALIZED_DESCRIPTIONS[skillId]) {
    return LOCALIZED_DESCRIPTIONS[skillId];
  }

  return `用于处理与 ${skillName} 相关的任务，具体能力可查看该 skill 的原始说明。`;
}

module.exports = {
  localizeDescription
};
