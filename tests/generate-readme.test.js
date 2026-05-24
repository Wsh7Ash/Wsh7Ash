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

test("README template uses the configured GitHub username placeholder", () => {
  const template = fs.readFileSync(path.join(ROOT_DIR, "README.template.md"), "utf8");

  assert.match(template, /\{\{GITHUB_USERNAME\}\}/);
  assert.doesNotMatch(template, /username=Wsh7Ash/);
  assert.doesNotMatch(template, /user=Wsh7Ash/);
});

test("repository stores default profile usernames in config", () => {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "profile.config.json"), "utf8"));

  assert.deepEqual(config, {
    github_username: "Wsh7Ash",
    picoctf_username: "spw",
    leetcode_username: "vOF31ss21z"
  });
});

test("profile config loader merges configured usernames with defaults", () => {
  const { loadProfileConfig } = require("../profile-config");
  const dir = createFixture();
  fs.writeFileSync(
    path.join(dir, "profile.config.json"),
    JSON.stringify({ github_username: "ExampleGitHub", picoctf_username: "ExamplePico" }, null, 2)
  );

  assert.deepEqual(loadProfileConfig(dir), {
    github_username: "ExampleGitHub",
    picoctf_username: "ExamplePico",
    leetcode_username: "vOF31ss21z"
  });
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

test("generator renders configured GitHub and picoCTF usernames", () => {
  const dir = createFixture();
  fs.writeFileSync(
    path.join(dir, "README.template.md"),
    "github={{GITHUB_USERNAME}}\n{{PLUGINS}}\n{{PICOCTF_STATS}}\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, "profile.config.json"),
    JSON.stringify(
      {
        github_username: "ExampleGitHub",
        picoctf_username: "ExamplePico",
        leetcode_username: "ExampleLeet"
      },
      null,
      2
    )
  );

  const result = runGenerator(dir);
  const rendered = fs.readFileSync(path.join(dir, "README.md"), "utf8");

  assert.equal(result.status, 0);
  assert.match(rendered, /github=ExampleGitHub/);
  assert.match(rendered, /https:\/\/play\.picoctf\.org\/users\/ExamplePico/);
});
