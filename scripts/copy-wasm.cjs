const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

const sourceDir = path.join(
  projectRoot,
  "node_modules",
  "@matbee",
  "libreoffice-converter"
);

const targetDir = path.join(projectRoot, "wasm");

// Các file cần copy
const files = [
  "wasm/loader.cjs",
  "wasm/soffice.cjs",
  "wasm/soffice.js",
  "wasm/soffice.data",
  "wasm/soffice.wasm",
  "wasm/soffice.worker.cjs",
  "wasm/soffice.worker.js",
  "dist/browser.worker.global.js"
];

console.log("Copying LibreOffice WASM files...");

// Tạo thư mục wasm nếu chưa có
fs.mkdirSync(targetDir, {
  recursive: true,
});

for (const file of files) {
  const source = path.join(sourceDir, file);

  let targetName;

  // browser.worker.global.js nằm trong dist
  if (file === "dist/browser.worker.global.js") {
    targetName = "browser.worker.global.js";
  } else {
    targetName = path.basename(file);
  }

  const target = path.join(targetDir, targetName);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing file: ${source}`);
  }

  fs.copyFileSync(source, target);

  console.log(`✓ ${targetName}`);
}

console.log("\nLibreOffice WASM copied successfully.");