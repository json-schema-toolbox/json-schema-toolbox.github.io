const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const fg = require("fast-glob");

const randomString = crypto.randomBytes(8).toString("hex");
const htmlFilePath = path.resolve("index.html");
const oldJSFilePaths = fg.sync("js/app.*.js");

oldJSFilePaths.forEach(oldJSFilePath => {
  fs.unlinkSync(oldJSFilePath);
});

const jsFileName = `app.${randomString}.js`;

const htmlCode = fs.readFileSync(htmlFilePath, {
  encoding: "utf8",
});

const jsCode = fs.readFileSync(path.resolve("js", "app.js"), {
  encoding: "utf8",
});

fs.writeFileSync(path.resolve("js", jsFileName), jsCode, {
  encoding: "utf8",
});

const newHTMLCode = htmlCode.replace(
  /js\/app(\.\w+)?\.js/g,
  `js/${jsFileName}`
);

fs.writeFileSync(htmlFilePath, newHTMLCode, {
  encoding: "utf8",
});

console.log("======== BUILD FINISHED ========");
