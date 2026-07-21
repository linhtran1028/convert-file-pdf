const express = require("express");
const path = require("path");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

const distPath = path.join(__dirname, "dist/angular-17-file-upload/browser");

app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 4200;

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
