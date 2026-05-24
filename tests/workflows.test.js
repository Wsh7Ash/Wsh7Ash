const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT_DIR = path.resolve(__dirname, "..");

function readWorkflow(file) {
  return fs.readFileSync(path.join(ROOT_DIR, ".github", "workflows", file), "utf8");
}

test("metrics workflow can run without a custom PAT", () => {
  const workflow = readWorkflow("metrics.yml");

  assert.match(workflow, /secrets\.METRICS_TOKEN\s*\|\|\s*github\.token/);
});

test("daily stats workflow also refreshes metrics SVGs", () => {
  const workflow = readWorkflow("picoctf.yml");

  assert.match(workflow, /uses:\s*lowlighter\/metrics@/);
  assert.match(workflow, /metrics\.base\.svg/);
  assert.match(workflow, /metrics\.plugin\.languages\.clean\.svg/);
  assert.match(workflow, /metrics\.plugin\.isocalendar\.fullyear\.clean\.svg/);
  assert.match(workflow, /git add .*\.svg/);
});
