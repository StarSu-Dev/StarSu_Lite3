import fs from "fs";
import path from "path";

export function copyContent(contentDir, publicDir) {
  fs.mkdirSync(path.join(publicDir, "content"), { recursive: true });
  fs.cpSync(contentDir, path.join(publicDir, "content"), { recursive: true });
  console.log("📂 Контент скопирован в public/content");
}
