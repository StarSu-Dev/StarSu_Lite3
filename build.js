import fs from "fs";
import path from "path";

import { scanMarkdown } from "./build/scanMarkdown.js";
import { generateSidebar } from "./build/generateSidebar.js";
import { injectScript } from "./build/injectScript.js";
import { copyContent } from "./build/copyContent.js";

const contentDir = "./content";
const publicDir = "./public";
const outputFile = path.join( "index.html");

copyContent(contentDir, publicDir);

const categories = {
  classes: "Классы",
  races: "Расы",
  skills: "Навыки",
  feats: "Черты",
  themes: "Темы",
  gear: "Снаряжение",
  ships: "Звездолёты",
  magic: "Магия и заклинания",
};

const guidesDir = path.join(contentDir, "guides");
const allFiles = scanMarkdown(guidesDir);

let template = fs.readFileSync(outputFile, "utf-8");

// Вставляем сайдбар
const sidebarHTML = generateSidebar(categories);
template = template.replace(
  /<aside class="sidebar" id="sidebar">[\s\S]*?<\/aside>/,
  `<aside class="sidebar" id="sidebar">${sidebarHTML}</aside>`
);

// Вставляем скрипт
template = injectScript(template, allFiles);

// Сохраняем
fs.writeFileSync(outputFile, template);

console.log("✅ Сборка завершена!");
