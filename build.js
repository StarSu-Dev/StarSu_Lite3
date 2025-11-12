import fs from "fs";
import path from "path";

// === Пути проекта ===
const contentDir = "./content";
const publicDir = "./public";
const outputFile = path.join(publicDir, "index.html");

// === Создание и копирование контента ===
fs.mkdirSync(path.join(publicDir, "content"), { recursive: true });
fs.cpSync(contentDir, path.join(publicDir, "content"), { recursive: true });
console.log("📂 Контент скопирован в public/content");

// === Чтение шаблона ===
let template = fs.readFileSync(outputFile, "utf-8");

// === Категории для справочников ===
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

// === Генерация сайдбара ===
let sidebarHTML = `
<div class="category open">
  <div class="category-header">Справочники<span class="arrow">▲</span></div>
  <ul class="category-links">
`;
for (const [key, title] of Object.entries(categories)) {
  sidebarHTML += `<li><a href="#" data-category="${key}">${title}</a></li>`;
}
sidebarHTML += `
  </ul>
</div>
`;

// === Вставка сайдбара ===
const sidebarRegex =
  /<aside\s+class="sidebar"\s+id="sidebar">[\s\S]*?<\/aside>/;
template = template.replace(
  sidebarRegex,
  `<aside class="sidebar" id="sidebar">\n${sidebarHTML}\n</aside>`
);

// === Основной скрипт ===
const script = `
<script>
window.md = window.md || window.markdownit({ html: true, linkify: true });

// === Аккордеон ===
document.addEventListener("click", (e) => {
  const header = e.target.closest(".category-header");
  if (header) header.parentElement.classList.toggle("open");
});

// === Обработка клика по категории ===
document.addEventListener("click", async (e) => {
  const link = e.target.closest("[data-category]");
  if (!link) return;
  e.preventDefault();

  const category = link.dataset.category;
  const cards = document.getElementById("cards");
  const content = document.getElementById("content");

  cards.innerHTML = "<p style='padding:20px;text-align:center;'>⏳ Загрузка...</p>";
  cards.style.display = "block";
  content.style.display = "none";

  // Получаем список файлов
  const files = await window.fetchList(\`content/guides/\${category}\`);
  if (!files.length) {
    cards.innerHTML = "<p style='padding:20px;'>⚠ В этой категории пока нет файлов.</p>";
    return;
  }

  // Отображаем карточки
  cards.innerHTML = files.map(f => {
    const name = decodeURIComponent(f.split("/").pop().replace(".md", ""));
    return \`<div class='card' data-file='\${f}'>
      <h3>\${name}</h3>
      <p>Markdown файл</p>
    </div>\`;
  }).join("");
});

// === Функция fetchList: безопасная генерация путей ===
window.fetchList = async (dir) => {
  try {
    const res = await fetch(dir);
    const html = await res.text();
    const matches = [...html.matchAll(/href="([^"]+\\.md)"/g)];
    return matches.map((m) => {
      // Убираем лишнее
      let href = m[1]
        .replace(/^\\/+/, "")
        .replace(/^public\\//, "")
        .replace(/\\/+/g, "/");

      // Если путь уже абсолютный — не добавляем dir
      if (href.startsWith("content/")) {
        return href;
      }

      return \`\${dir}/\${href}\`.replace(/\\/+/g, "/");
    });
  } catch (err) {
    console.error("Ошибка fetchList:", err);
    return [];
  }
};

// === Клик по карточке: загрузка Markdown ===
document.addEventListener("click", async (e) => {
  const card = e.target.closest("[data-file]");
  if (!card) return;
  e.preventDefault();

  const file = card.dataset.file
    .replace(/^\\/?public\\//, "")
    .replace(/\\/+/g, "/");

  console.log("📖 Загружаем:", file);

  const cards = document.getElementById("cards");
  const content = document.getElementById("content");
  cards.style.display = "none";
  content.innerHTML = "<p>⏳ Загрузка файла...</p>";
  content.style.display = "block";

  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error("Не найден файл: " + file);
    const text = await res.text();
    const html = md.render(text);
    content.innerHTML = html + '<br><button id="backBtn">← Назад</button>';
    document.getElementById("backBtn").onclick = () => {
      content.style.display = "none";
      cards.style.display = "grid";
    };
  } catch (err) {
    console.error("Ошибка:", err);
    content.innerHTML = \`<p style='color:red;'>⚠ Ошибка: \${err.message}</p>\`;
  }
});
</script>
`;

// === Вставляем скрипт перед </body> ===
template = template.replace(/<\/body>/, script + "\n</body>");
fs.writeFileSync(outputFile, template);
console.log("✅ Сборка завершена без ошибок!");
