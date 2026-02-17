const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const TEMPLATE = path.join(ROOT_DIR, "README.template.md");
const OUTPUT = path.join(ROOT_DIR, "README.md");
const PLUGINS_DIR = path.join(ROOT_DIR, "plugins");
const STATS_FILE = path.join(ROOT_DIR, "picoctf-stats.json");

function loadPlugins() {
  if (!fs.existsSync(PLUGINS_DIR)) return [];
  const plugins = [];
  const files = fs.readdirSync(PLUGINS_DIR);

  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const p = JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, file), "utf8"));
      plugins.push(p);
    }
  });

  return plugins
    .filter((p) => p.enabled)
    .sort((a, b) => a.order - b.order);
}

function renderPlugins(plugins) {
  return plugins
    .map((p) => {
      let filename = p.output;
      if (p.use_clean) {
        filename = filename.replace(".svg", ".clean.svg");
      }
      return `<!-- plugin:${p.id} ${p.use_clean ? "(clean)" : ""} -->\n![${p.name}](${filename})`;
    })
    .join("\n\n");
}

function renderPicoCTF() {
  console.log(`[generate-readme] Checking for stats file at: ${STATS_FILE}`);
  if (!fs.existsSync(STATS_FILE)) {
    console.log(`[generate-readme] Stats file NOT FOUND. Existing files: ${fs.readdirSync(ROOT_DIR).join(", ")}`);
    return "<!-- picoCTF stats not found -->";
  }

  const stats = JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  return `
### 🚩 picoCTF Statistics
| Attribute | Value |
| :--- | :--- |
| **World Rank** | ${stats.rank || "N/A"} |
| **Total Score** | ${stats.score || "0"} |
| **Challenges Solved** | ${stats.solved || "0"} |

[View picoCTF Profile](https://play.picoctf.org/users/spw)
`;
}

function main() {
  console.log(`[generate-readme] CWD: ${process.cwd()}`);
  const plugins = loadPlugins();
  const template = fs.readFileSync(TEMPLATE, "utf8");
  let rendered = template.replace("{{PLUGINS}}", renderPlugins(plugins));
  rendered = rendered.replace("{{PICOCTF_STATS}}", renderPicoCTF());

  fs.writeFileSync(OUTPUT, rendered, "utf8");
  console.log(`[generate-readme] Wrote ${OUTPUT}`);
}

main();
