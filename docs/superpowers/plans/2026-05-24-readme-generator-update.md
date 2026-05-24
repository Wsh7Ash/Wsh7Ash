# README Generator Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore metrics plugin rendering, add generator validation tests, and centralize profile usernames without changing the current default profile output.

**Architecture:** Keep the repo as a plain Node.js project. Extract testable functions from `generate-readme.js`, add a JSON config file for usernames, and validate template/plugin contracts before writing `README.md`.

**Tech Stack:** Node.js CommonJS, Node built-in `node:test`, GitHub Actions YAML, Markdown templates.

---

## File Structure

- Modify `package.json`: add a `test` script and remove the hardcoded picoCTF username from `scrape-picoctf`.
- Create `profile.config.json`: store `github_username`, `picoctf_username`, and `leetcode_username` defaults.
- Modify `generate-readme.js`: export testable helpers, load profile config, validate required placeholders, validate plugin config, and render username placeholders.
- Modify `picoctf-scraper.js`: load `profile.config.json` and use the configured picoCTF username when no CLI argument is passed.
- Modify `README.template.md`: restore `{{PLUGINS}}` and replace hardcoded GitHub username text in generated URLs with `{{GITHUB_USERNAME}}`.
- Modify `.github/workflows/picoctf.yml`: run the scraper without hardcoding `spw`.
- Modify `.github/workflows/metrics.yml`: use the configured default LeetCode username through a repository variable fallback expression.
- Create `tests/generate-readme.test.js`: fixture-based generator tests using temporary directories.
- Regenerate `README.md`: run the generator after tests are green.

---

### Task 1: Restore Metrics Placeholder With a Failing Test

**Files:**
- Create: `tests/generate-readme.test.js`
- Modify: `package.json`
- Modify: `README.template.md`

- [ ] **Step 1: Add the test script**

Patch `package.json` so scripts include:

```json
{
  "generate": "node generate-readme.js",
  "scrape-picoctf": "node picoctf-scraper.js spw",
  "test": "node --test"
}
```

- [ ] **Step 2: Write the failing placeholder test**

Create `tests/generate-readme.test.js` with:

```javascript
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT_DIR = path.resolve(__dirname, "..");

test("README template keeps the plugins placeholder", () => {
  const template = fs.readFileSync(path.join(ROOT_DIR, "README.template.md"), "utf8");

  assert.match(template, /\{\{PLUGINS\}\}/);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL with an assertion showing `{{PLUGINS}}` was not found in `README.template.md`.

- [ ] **Step 4: Restore the placeholder**

In `README.template.md`, under `# My Metrics & Stats`, add:

```markdown
{{PLUGINS}}
```

Leave `{{PICOCTF_STATS}}` below it.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json tests/generate-readme.test.js README.template.md
git commit -m "test: cover README metrics placeholder"
```

---

### Task 2: Validate Generator Placeholders and Plugin Config

**Files:**
- Modify: `tests/generate-readme.test.js`
- Modify: `generate-readme.js`

- [ ] **Step 1: Write failing tests for generator validation**

Replace `tests/generate-readme.test.js` with:

```javascript
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT_DIR = path.resolve(__dirname, "..");
const generator = require("../generate-readme");

function createFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "githubmd-"));
  fs.mkdirSync(path.join(dir, "plugins"));
  fs.writeFileSync(
    path.join(dir, "profile.config.json"),
    JSON.stringify({
      github_username: "Wsh7Ash",
      picoctf_username: "spw",
      leetcode_username: "vOF31ss21z"
    }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, "plugins", "base.json"),
    JSON.stringify({
      id: "base",
      name: "Classic Stats",
      output: "metrics.base.svg",
      enabled: true,
      use_clean: false,
      order: 0
    }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, "picoctf-stats.json"),
    JSON.stringify({ rank: "#1", score: "100", solved: "31" }, null, 2)
  );
  return dir;
}

test("README template keeps the plugins placeholder", () => {
  const template = fs.readFileSync(path.join(ROOT_DIR, "README.template.md"), "utf8");

  assert.match(template, /\{\{PLUGINS\}\}/);
});

test("generateReadme fails when the plugins placeholder is missing", () => {
  const dir = createFixture();
  fs.writeFileSync(path.join(dir, "README.template.md"), "{{PICOCTF_STATS}}\n", "utf8");

  assert.throws(
    () => generator.generateReadme({ rootDir: dir }),
    /README\.template\.md is missing required placeholder: \{\{PLUGINS\}\}/
  );
});

test("generateReadme fails on invalid enabled plugin config", () => {
  const dir = createFixture();
  fs.writeFileSync(path.join(dir, "README.template.md"), "{{PLUGINS}}\n{{PICOCTF_STATS}}\n", "utf8");
  fs.writeFileSync(
    path.join(dir, "plugins", "bad.json"),
    JSON.stringify({ id: "bad", enabled: true, order: 1 }, null, 2)
  );

  assert.throws(
    () => generator.generateReadme({ rootDir: dir }),
    /Invalid plugin config in bad\.json: missing name, output/
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

Expected: FAIL because `generate-readme.js` does not export `generateReadme`, does not validate missing placeholders, and does not validate enabled plugin fields.

- [ ] **Step 3: Export generator helpers and add validation**

Replace `generate-readme.js` with:

```javascript
const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG = {
  github_username: "Wsh7Ash",
  picoctf_username: "spw",
  leetcode_username: "vOF31ss21z"
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadProfileConfig(rootDir) {
  const configPath = path.join(rootDir, "profile.config.json");
  if (!fs.existsSync(configPath)) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...readJson(configPath) };
}

function validateTemplate(template, placeholders, templateName = "README.template.md") {
  for (const placeholder of placeholders) {
    if (!template.includes(placeholder)) {
      throw new Error(`${templateName} is missing required placeholder: ${placeholder}`);
    }
  }
}

function validatePlugin(plugin, file) {
  if (!plugin.enabled) return;

  const missing = ["id", "name", "output", "order"].filter((field) => plugin[field] === undefined || plugin[field] === null || plugin[field] === "");
  if (missing.length > 0) {
    throw new Error(`Invalid plugin config in ${file}: missing ${missing.join(", ")}`);
  }
}

function loadPlugins(rootDir) {
  const pluginsDir = path.join(rootDir, "plugins");
  if (!fs.existsSync(pluginsDir)) return [];

  return fs
    .readdirSync(pluginsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const plugin = readJson(path.join(pluginsDir, file));
      validatePlugin(plugin, file);
      return plugin;
    })
    .filter((plugin) => plugin.enabled)
    .sort((a, b) => a.order - b.order);
}

function renderPlugins(plugins) {
  return plugins
    .map((plugin) => {
      const filename = plugin.use_clean ? plugin.output.replace(".svg", ".clean.svg") : plugin.output;
      return `<!-- plugin:${plugin.id} ${plugin.use_clean ? "(clean)" : ""} -->\n![${plugin.name}](${filename})`;
    })
    .join("\n\n");
}

function renderPicoCTF(rootDir, config) {
  const statsFile = path.join(rootDir, "picoctf-stats.json");
  if (!fs.existsSync(statsFile)) {
    return "<!-- picoCTF stats not found -->";
  }

  const stats = readJson(statsFile);
  return `
### picoCTF Statistics
| Attribute | Value |
| :--- | :--- |
| **World Rank** | ${stats.rank || "N/A"} |
| **Total Score** | ${stats.score || "0"} |
| **Challenges Solved** | ${stats.solved || "0"} |

[View picoCTF Profile](https://play.picoctf.org/users/${config.picoctf_username})
`;
}

function replaceAll(rendered, replacements) {
  let output = rendered;
  for (const [placeholder, value] of Object.entries(replacements)) {
    output = output.split(placeholder).join(value);
  }
  return output;
}

function generateReadme({ rootDir = process.cwd(), write = true } = {}) {
  const templatePath = path.join(rootDir, "README.template.md");
  const outputPath = path.join(rootDir, "README.md");
  const template = fs.readFileSync(templatePath, "utf8");
  const config = loadProfileConfig(rootDir);

  validateTemplate(template, ["{{PLUGINS}}", "{{PICOCTF_STATS}}"]);

  const rendered = replaceAll(template, {
    "{{GITHUB_USERNAME}}": config.github_username,
    "{{PLUGINS}}": renderPlugins(loadPlugins(rootDir)),
    "{{PICOCTF_STATS}}": renderPicoCTF(rootDir, config)
  });

  if (write) {
    fs.writeFileSync(outputPath, rendered, "utf8");
  }

  return rendered;
}

function main() {
  const outputPath = path.join(process.cwd(), "README.md");
  generateReadme();
  console.log(`[generate-readme] Wrote ${outputPath}`);
}

module.exports = {
  DEFAULT_CONFIG,
  generateReadme,
  loadPlugins,
  loadProfileConfig,
  renderPicoCTF,
  renderPlugins,
  validateTemplate
};

if (require.main === module) {
  main();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add generate-readme.js tests/generate-readme.test.js
git commit -m "feat: validate README generator inputs"
```

---

### Task 3: Centralize Profile Usernames

**Files:**
- Create: `profile.config.json`
- Modify: `tests/generate-readme.test.js`
- Modify: `README.template.md`
- Modify: `picoctf-scraper.js`
- Modify: `package.json`
- Modify: `.github/workflows/picoctf.yml`
- Modify: `.github/workflows/metrics.yml`
- Modify: `README.md`

- [ ] **Step 1: Write failing config rendering test**

Append this test to `tests/generate-readme.test.js`:

```javascript
test("generateReadme renders configured GitHub and picoCTF usernames", () => {
  const dir = createFixture();
  fs.writeFileSync(
    path.join(dir, "README.template.md"),
    "github={{GITHUB_USERNAME}}\n{{PLUGINS}}\n{{PICOCTF_STATS}}\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, "profile.config.json"),
    JSON.stringify({
      github_username: "ExampleGitHub",
      picoctf_username: "ExamplePico",
      leetcode_username: "ExampleLeet"
    }, null, 2)
  );

  const rendered = generator.generateReadme({ rootDir: dir, write: false });

  assert.match(rendered, /github=ExampleGitHub/);
  assert.match(rendered, /https:\/\/play\.picoctf\.org\/users\/ExamplePico/);
});
```

- [ ] **Step 2: Run tests to verify the new test fails**

Run: `npm test`

Expected: FAIL until the template and config file are wired into the real project files.

- [ ] **Step 3: Add profile config**

Create `profile.config.json`:

```json
{
  "github_username": "Wsh7Ash",
  "picoctf_username": "spw",
  "leetcode_username": "vOF31ss21z"
}
```

- [ ] **Step 4: Update README template username placeholders**

In `README.template.md`, replace `Wsh7Ash` inside profile-related URLs with `{{GITHUB_USERNAME}}`:

```markdown
![](https://komarev.com/ghpvc/?username={{GITHUB_USERNAME}})
```

```html
<img src="https://github-readme-stats.vercel.app/api?username={{GITHUB_USERNAME}}&show_icons=true&theme=tokyonight&hide_border=true" height="165"/>
<img src="https://github-readme-stats.vercel.app/api/top-langs/?username={{GITHUB_USERNAME}}&layout=compact&theme=tokyonight&hide_border=true" height="165"/>
<img src="https://streak-stats.demolab.com?user={{GITHUB_USERNAME}}&theme=tokyonight&hide_border=true" height="165"/>
```

- [ ] **Step 5: Update picoCTF scraper default config**

In `picoctf-scraper.js`, add:

```javascript
const path = require("path");

function loadPicoCTFUsername() {
    try {
        const configPath = path.join(process.cwd(), "profile.config.json");
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        return config.picoctf_username || "spw";
    } catch {
        return "spw";
    }
}
```

Then replace:

```javascript
const user = process.argv[2] || 'spw';
```

with:

```javascript
const user = process.argv[2] || loadPicoCTFUsername();
```

- [ ] **Step 6: Remove the hardcoded picoCTF script argument**

Patch `package.json` so scripts include:

```json
{
  "generate": "node generate-readme.js",
  "scrape-picoctf": "node picoctf-scraper.js",
  "test": "node --test"
}
```

- [ ] **Step 7: Update GitHub Actions hardcoded usernames**

In `.github/workflows/picoctf.yml`, replace:

```yaml
run: node picoctf-scraper.js spw
```

with:

```yaml
run: node picoctf-scraper.js
```

In `.github/workflows/metrics.yml`, replace both LeetCode values:

```yaml
plugin_leetcode_user: "vOF31ss21z"
```

with:

```yaml
plugin_leetcode_user: "${{ vars.LEETCODE_USER || 'vOF31ss21z' }}"
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 9: Regenerate README**

Run: `npm run generate`

Expected: `README.md` includes plugin image links under `# My Metrics & Stats`, keeps current username output as `Wsh7Ash`, and keeps picoCTF profile output as `spw`.

- [ ] **Step 10: Run syntax checks**

Run:

```bash
node --check generate-readme.js
node --check picoctf-scraper.js
```

Expected: both commands complete without syntax errors.

- [ ] **Step 11: Commit**

```bash
git add profile.config.json README.template.md README.md picoctf-scraper.js package.json .github/workflows/picoctf.yml .github/workflows/metrics.yml tests/generate-readme.test.js
git commit -m "feat: centralize profile usernames"
```

---

## Self-Review

- Spec coverage: Task 1 restores metrics rendering, Task 2 adds loud validation, and Task 3 centralizes usernames while preserving defaults.
- Placeholder scan: The plan includes concrete paths, test code, implementation code, commands, and expected outcomes.
- Type consistency: The plan consistently uses `generateReadme`, `profile.config.json`, `github_username`, `picoctf_username`, and `leetcode_username`.
