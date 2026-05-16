const path = require("node:path");

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, "\n");
}

function parseFrontmatter(markdown) {
  const text = normalizeLineEndings(markdown);
  if (!text.startsWith("---\n")) {
    return {};
  }

  const endIndex = text.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return {};
  }

  const block = text.slice(4, endIndex).trim();
  const fields = {};

  for (const line of block.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = value;
  }

  return fields;
}

function extractFirstParagraph(markdown) {
  const text = normalizeLineEndings(markdown)
    .replace(/^---\n[\s\S]*?\n---\n?/, "")
    .replace(/^#.*$/gm, "")
    .trim();

  if (!text) {
    return "暂无简介";
  }

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  return paragraphs[0] || "暂无简介";
}

function parseSkillMarkdown(markdown, skillDir) {
  const frontmatter = parseFrontmatter(markdown);
  const baseName = path.basename(skillDir);
  const sourceDescription = frontmatter.description || extractFirstParagraph(markdown);

  return {
    name: frontmatter.name || baseName,
    sourceDescription
  };
}

module.exports = {
  extractFirstParagraph,
  parseFrontmatter,
  parseSkillMarkdown
};
