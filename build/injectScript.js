import fs from "fs";

export function injectScript(template, allFiles) {
  // === Полный встроенный JS, который раньше был в build.js ===
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

    // 🔹 Исправленное поведение кнопки "Назад"
    document.getElementById("backBtn").onclick = () => {
      content.classList.remove("active");
      content.innerHTML = "";
      cards.style.display = "grid";
      history.pushState("", "", "#" + currentCategory);
      window.scrollTo({ top: 0, behavior: "instant" });
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

    const content = document.getElementById("content");
    if (content) {
      content.classList.remove("active");
      content.innerHTML = "";
    }

    window.scrollTo({ top: 0, behavior: "instant" });
    adjustMobileContent();

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

  // Удаляем старые <script> теги
  template = template.replace(/<script>[\s\S]*?<\/script>/g, "");

  // Добавляем markdown-it, если нет
  if (!template.includes("markdown-it.min.js")) {
    template = template.replace(
      "</head>",
      `<script src="https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js"></script>\n</head>`
    );
  }

  // Вставляем новый скрипт перед </body>
  return template.replace("</body>", script + "\n</body>");
}
