const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT_DIR = path.resolve(__dirname, "..");

test("README template keeps the plugins placeholder", () => {
  const template = fs.readFileSync(path.join(ROOT_DIR, "README.template.md"), "utf8");

  assert.match(template, /\{\{PLUGINS\}\}/);
});
