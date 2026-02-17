#!/usr/bin/env node
/**
 * generate-readme.js
 *
 * Reads all plugin configs from plugins/*.json, sorts them by `order`,
 * filters enabled ones, and generates README.md from README.template.md.
 *
 * Usage:
 *   node generate-readme.js
 *
 * To add a new plugin:
 *   1. Create plugins/<id>.json with the standard schema
 *   2. Add the corresponding step in .github/workflows/metrics.yml
 *   3. Run this script (or let the CI do it)
 */

const fs = require("fs");
const path = require("path");

const PLUGINS_DIR = path.join(__dirname, "plugins");
const TEMPLATE = path.join(__dirname, "README.template.md");
const OUTPUT = path.join(__dirname, "README.md");

// ── Load & validate plugins ─────────────────────────────────────────
function loadPlugins() {
  const files = fs.readdirSync(PLUGINS_DIR).filter((f) => f.endsWith(".json"));
  const plugins = files.map((f) => {
    const raw = fs.readFileSync(path.join(PLUGINS_DIR, f), "utf8");
    const plugin = JSON.parse(raw);

    // Basic schema validation
    const required = ["id", "name", "output", "enabled", "order", "config"];
    for (const key of required) {
      if (!(key in plugin)) {
        throw new Error(`Plugin ${f} is missing required field: "${key}"`);
      }
    }
    return plugin;
  });

  return plugins
    .filter((p) => p.enabled)
    .sort((a, b) => a.order - b.order);
}

// ── Render plugin section ───────────────────────────────────────────
function renderPlugins(plugins) {
  return plugins
    .map((p) => {
      let filename = p.output;
      if (p.use_clean) {
        filename = filename.replace(".svg", ".clean.svg");
      }
      return `<!-- plugin:${p.id} ${p.use_clean ? "(clean)" : ""} -->\n<img src="./${filename}" alt="${p.name}">`;
    })
    .join("\n\n");
}

// ── Render picoCTF section ──────────────────────────────────────────
function renderPicoCTF() {
  const statsFile = path.join(__dirname, "picoctf-stats.json");
  if (!fs.existsSync(statsFile)) return "<!-- picoCTF stats not found -->";

  const stats = JSON.parse(fs.readFileSync(statsFile, "utf8"));
  if (!stats.score && !stats.rank && !stats.solved) return "<!-- picoCTF stats empty -->";

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

// ── Main ────────────────────────────────────────────────────────────
function main() {
  const plugins = loadPlugins();
  console.log(`[generate-readme] Found ${plugins.length} enabled plugin(s):`);
  plugins.forEach((p) => console.log(`  • ${p.id} (order: ${p.order})`));

  const template = fs.readFileSync(TEMPLATE, "utf8");
  let rendered = template.replace("{{PLUGINS}}", renderPlugins(plugins));
  rendered = rendered.replace("{{PICOCTF_STATS}}", renderPicoCTF());

  fs.writeFileSync(OUTPUT, rendered, "utf8");
  console.log(`[generate-readme] Wrote ${OUTPUT}`);
}

main();
