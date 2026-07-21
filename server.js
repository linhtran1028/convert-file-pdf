const express = require("express");
const path = require("path");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(
  express.static(path.join(__dirname, "dist/angular-17-file-upload/browser")),
);

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "dist/angular-17-file-upload/browser/index.html"),
  );
});

app.listen(4200, () => {
  console.log("http://localhost:4200");
});
