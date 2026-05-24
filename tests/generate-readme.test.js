const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT_DIR = path.resolve(__dirname, "..");
const GENERATOR = path.join(ROOT_DIR, "generate-readme.js");

function createFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "githubmd-"));
  fs.mkdirSync(path.join(dir, "plugins"));
  fs.writeFileSync(
    path.join(dir, "plugins", "base.json"),
    JSON.stringify(
      {
        id: "base",
        name: "Classic Stats",
        output: "metrics.base.svg",
        enabled: true,
        use_clean: false,
        order: 0
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(dir, "picoctf-stats.json"),
    JSON.stringify({ rank: "#1", score: "100", solved: "31" }, null, 2)
  );
  return dir;
}

function runGenerator(cwd) {
  return spawnSync(process.execPath, [GENERATOR], {
    cwd,
    encoding: "utf8"
  });
}

test("README template keeps the plugins placeholder", () => {
  const template = fs.readFileSync(path.join(ROOT_DIR, "README.template.md"), "utf8");

  assert.match(template, /\{\{PLUGINS\}\}/);
});

test("generator fails when the plugins placeholder is missing", () => {
  const dir = createFixture();
  fs.writeFileSync(path.join(dir, "README.template.md"), "{{PICOCTF_STATS}}\n", "utf8");

  const result = runGenerator(dir);

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /README\.template\.md is missing required placeholder: \{\{PLUGINS\}\}/
  );
});

test("generator fails on invalid enabled plugin config", () => {
  const dir = createFixture();
  fs.writeFileSync(path.join(dir, "README.template.md"), "{{PLUGINS}}\n{{PICOCTF_STATS}}\n", "utf8");
  fs.writeFileSync(
    path.join(dir, "plugins", "bad.json"),
    JSON.stringify({ id: "bad", enabled: true, order: 1 }, null, 2)
  );

  const result = runGenerator(dir);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid plugin config in bad\.json: missing name, output/);
});
