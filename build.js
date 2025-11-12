import fs from "fs";
import path from "path";

const contentDir = "./content";
const publicDir = "./public";
const outputFile = path.join(publicDir, "index.html");

// Копирование контента
fs.mkdirSync(path.join(publicDir, "content"), { recursive: true });
fs.cpSync(contentDir, path.join(publicDir, "content"), { recursive: true });
console.log("📂 Контент скопирован в public/content");

// Чтение шаблона
let template = fs.readFileSync(outputFile, "utf-8");

// Категории
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

// === Сканирование markdown-файлов ===
function scanMarkdown(root) {
  const result = {};
  if (!fs.existsSync(root)) return result;
  const dirs = fs.readdirSync(root, { withFileTypes: true });
  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const catPath = path.join(root, dir.name);
      const files = fs
        .readdirSync(catPath)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f);
      result[dir.name] = files;
    }
  }
  return result;
}

const guidesDir = path.join(contentDir, "guides");
const allFiles = scanMarkdown(guidesDir);
console.log("📘 Найдено категорий:", Object.keys(allFiles).length);

// === Генерация сайдбара ===
let sidebarHTML = `
<div class="category open">
  <div class="category-header">Справочники<span class="arrow">▲</span></div>
  <ul class="category-links">
`;
for (const [key, title] of Object.entries(categories)) {
  sidebarHTML += `<li><a href="#${key}" data-category="${key}">${title}</a></li>`;
}
sidebarHTML += `
  </ul>
</div>
`;

const sidebarRegex =
  /<aside\s+class="sidebar"\s+id="sidebar">[\s\S]*?<\/aside>/;
template = template.replace(
  sidebarRegex,
  `<aside class="sidebar" id="sidebar">\n${sidebarHTML}\n</aside>`
);

// Удаляем старые <script>
template = template.replace(/<script>[\s\S]*?<\/script>/g, "");

// Добавляем markdown-it
if (!template.includes("markdown-it.min.js")) {
  template = template.replace(
    "</head>",
    `<script src="https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js"></script>\n</head>`
  );
}

// === Основной JS ===
const script = `
<script>
const md = window.markdownit({ html: true, linkify: true });
let currentCategory = "";
const allFiles = ${JSON.stringify(allFiles, null, 2)};

// Очистка путей
function cleanPath(p) {
  if (!p) return "";
  return decodeURIComponent(p.replace(/public\\//g, "").replace(/^\\//, ""));
}

// === Элементы интерфейса ===
const menuToggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("overlay");

// === Загрузка Markdown ===
async function loadMarkdown(file) {
  const filePath = cleanPath(file);
  console.log("📖 Загружаем:", filePath);

  const cards = document.getElementById("cards");
  const content = document.getElementById("content");

  cards.style.display = "none";
  content.classList.add("active");
  content.innerHTML = "<p>⏳ Загрузка файла...</p>";

  try {
    const res = await fetch(filePath);
    if (!res.ok) {
      content.innerHTML = "<p style='color:red'>Файл не найден.</p>";
      return;
    }

    const text = await res.text();
    const html = md.render(text);
    content.innerHTML = html + '<br><button id="backBtn">← Назад</button>';

    adjustMobileContent();

    document.getElementById("backBtn").onclick = () => {
      content.classList.remove("active");
      cards.style.display = "grid";
      history.pushState("", "", "#" + currentCategory);
      adjustMobileContent();
    };
  } catch (err) {
    console.error("Ошибка при загрузке:", err);
    content.innerHTML = "<p style='color:red'>Ошибка загрузки файла.</p>";
  }
}

// === Загрузка категории ===
async function loadCategory(category) {
  currentCategory = category;
  const cards = document.getElementById("cards");
  const content = document.getElementById("content");

  cards.style.display = "grid";
  cards.innerHTML = "<p style='padding:20px;text-align:center;'>⏳ Загрузка...</p>";
  content.classList.remove("active");

  const files = (allFiles[category] || []).map(f => \`content/guides/\${category}/\${f}\`);

  if (!files.length) {
    cards.innerHTML = "<p style='padding:20px;'>Нет доступных файлов.</p>";
    return;
  }

  cards.innerHTML = files.map(f => {
    const name = decodeURIComponent(f.split("/").pop().replace(".md", ""));
    const hash = \`#\${category}/\${encodeURIComponent(name)}\`;
    return \`<div class='card' data-file='\${f}' data-hash='\${hash}'>
      <h3>\${name}</h3>
      <p>Markdown файл</p>
    </div>\`;
  }).join("");
}

// === Обработка кликов ===
document.addEventListener("click", async (e) => {
  const cat = e.target.closest("[data-category]");
  const card = e.target.closest("[data-file]");

  // Клик по категории
  if (cat) {
    e.preventDefault();
    const category = cat.dataset.category;
    history.pushState("", "", "#" + category);
    await loadCategory(category);

    // 🔹 Закрытие сайдбара на мобильных
    if (window.innerWidth <= 768 && sidebar && overlay) {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    }
    return;
  }

  // Клик по карточке
  if (card) {
    e.preventDefault();
    const file = cleanPath(card.dataset.file);
    const hash = card.dataset.hash;
    history.pushState("", "", hash);
    await loadMarkdown(file);

    // 🔹 Также закрываем сайдбар
    if (window.innerWidth <= 768 && sidebar && overlay) {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    }
  }
});

// === Обработка якорей ===
async function handleHash() {
  const hash = location.hash.slice(1);
  if (!hash) return;
  const [category, item] = hash.split("/");
  if (!category) return;

  await loadCategory(category);
  if (item) {
    const file = \`content/guides/\${category}/\${decodeURIComponent(item)}.md\`;
    await loadMarkdown(file);
  }
}

if (location.hash) handleHash();
window.addEventListener("hashchange", handleHash);

// === Аккордеон ===
function initAccordion() {
  document.querySelectorAll(".category-header").forEach(header => {
    header.addEventListener("click", () => {
      header.closest(".category").classList.toggle("open");
    });
  });
}
window.addEventListener("DOMContentLoaded", initAccordion);

// === Мобильное меню ===
if (menuToggle && sidebar && overlay) {
  menuToggle.addEventListener("click", () => {
    const isActive = sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
    if (isActive) initAccordion();
  });
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  });
}

// === Динамическое выравнивание контента под хедер ===
function adjustMobileContent() {
  const header = document.querySelector("header");
  const content = document.getElementById("content");
  if (!header || !content) return;

  if (window.innerWidth <= 768) {
    const headerHeight = header.offsetHeight;
    content.style.marginTop = headerHeight + -6 + "px";
  } else {
    content.style.marginTop = "";
  }
}

window.addEventListener("resize", adjustMobileContent);
window.addEventListener("load", adjustMobileContent);
document.addEventListener("DOMContentLoaded", adjustMobileContent);
</script>
`;

template = template.replace("</body>", script + "\n</body>");
fs.writeFileSync(outputFile, template);
console.log(
  "✅ Сборка завершена! Сайдбар теперь закрывается после кликов на мобильных устройствах."
);
