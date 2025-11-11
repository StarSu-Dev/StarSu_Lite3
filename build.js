// ✅ Импорт стандартных модулей Node.js
import fs from "fs";
import path from "path";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

const contentDir = "./content";
const publicDir = "./public";
const publicContent = path.join(publicDir, "content");
const outputFile = path.join(publicDir, "index.html");

// Создаём public/content, если нет
fs.mkdirSync(publicContent, { recursive: true });

// ✅ Копируем все .md файлы (и папки) внутрь public/content
fs.cpSync(contentDir, publicContent, { recursive: true });

// Загружаем шаблон index.html
let template = fs.readFileSync(outputFile, "utf-8");

// Удаляем старые вставки аккордеонов (если были)
template = template.replace(
  /<!-- build.js вставит аккордеоны -->[\s\S]*?(<\/aside>)/,
  "<!-- build.js вставит аккордеоны -->$1"
);

// === Настройки категорий ===
const categoryNames = {
  guides: "Справочники",
  classes: "Классы",
  races: "Расы",
  themes: "Темы",
  newbie: "Новичку",
  misc: "Разное",
};

// === Рекурсивный сбор всех .md ===
function collectMarkdown(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let result = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result = result.concat(collectMarkdown(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      result.push(fullPath);
    }
  }
  return result;
}

// === Генерация аккордеонов ===
let sidebarHTML = "";
const categories = fs
  .readdirSync(contentDir)
  .filter((f) => fs.statSync(path.join(contentDir, f)).isDirectory());

for (const category of categories) {
  const files = collectMarkdown(path.join(contentDir, category));
  if (!files.length) continue;

  const categoryTitle = categoryNames[category] || category;
  let linksHTML = "";

  for (const filePath of files) {
    // ✅ Исправлено: используем path.relative от contentDir
    const relPath = path.relative(contentDir, filePath).replace(/\\/g, "/");
    const fileName = path.basename(filePath, ".md");

    const raw = fs.readFileSync(filePath, "utf-8");

    // читаем мета, если есть
    const metaMatch = raw.match(/---([\s\S]*?)---/);
    let title = fileName;
    if (metaMatch) {
      const meta = Object.fromEntries(
        metaMatch[1]
          .split("\n")
          .map((l) => l.split(":").map((v) => v.trim()))
          .filter(([k]) => k)
      );
      if (meta.title) title = meta.title;
    }

    // ✅ Правильный путь к Markdown-файлу
    linksHTML += `<li><a href="#" data-file="/content/${relPath}">${title}</a></li>`;
  }

  sidebarHTML += `
  <div class="category">
    <div class="category-header">${categoryTitle}<span class="arrow">▲</span></div>
    <ul class="category-links">${linksHTML}</ul>
  </div>`;
}

// === Вставляем аккордеоны ===
if (template.includes("<!-- build.js вставит аккордеоны -->")) {
  template = template.replace(
    "<!-- build.js вставит аккордеоны -->",
    sidebarHTML
  );
} else {
  template = template.replace(
    /(<aside[^>]*id=["']sidebar["'][^>]*>)/,
    `$1\n${sidebarHTML}`
  );
}

// === Сохраняем результат ===
fs.writeFileSync(outputFile, template);
console.log("✅ Сборка завершена: аккордеоны добавлены без ошибок путей");
