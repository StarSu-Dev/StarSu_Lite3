export function generateSidebar(categories) {
  let html = `
<div class="category open">
  <div class="category-header">Справочники<span class="arrow">▲</span></div>
  <ul class="category-links">
`;

  for (const [key, title] of Object.entries(categories)) {
    html += `<li><a href="#${key}" data-category="${key}">${title}</a></li>`;
  }

  html += `
  </ul>
</div>`;

  return html;
}
