import fs from "fs";
import path from "path";

export function scanMarkdown(root) {
  const result = {};

  if (!fs.existsSync(root)) return result;

  const dirs = fs.readdirSync(root, { withFileTypes: true });

  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const catDir = path.join(root, dir.name);
      const files = fs.readdirSync(catDir).filter((f) => f.endsWith(".md"));

      result[dir.name] = files;
    }
  }

  return result;
}
