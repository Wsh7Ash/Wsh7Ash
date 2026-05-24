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
  if (!fs.existsSync(configPath)) return { ...DEFAULT_CONFIG };

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

  const missing = ["id", "name", "output", "order"].filter((field) => {
    return plugin[field] === undefined || plugin[field] === null || plugin[field] === "";
  });

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
      const filename = plugin.use_clean
        ? plugin.output.replace(".svg", ".clean.svg")
        : plugin.output;
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
### 🚩 picoCTF Statistics
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
  try {
    main();
  } catch (error) {
    console.error(`[generate-readme] ${error.message}`);
    process.exitCode = 1;
  }
}
