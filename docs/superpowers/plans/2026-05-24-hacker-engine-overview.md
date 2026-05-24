# Hacker Engine Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the profile README overview with a hacker systems, custom C++ engine, and C++ games focus.

**Architecture:** The README remains generated from `README.template.md`. Tests guard required profile content and placeholders; `npm run generate` writes the final `README.md`.

**Tech Stack:** Node.js CommonJS, Node built-in `node:test`, Markdown/HTML profile README.

---

## File Structure

- Modify `README.template.md`: add the intro and `Current Focus` section below the banner.
- Modify `tests/generate-readme.test.js`: add assertions for the new overview copy and required placeholders.
- Regenerate `README.md`: run the existing generator.

---

### Task 1: Add Overview Content With Tests

**Files:**
- Modify: `tests/generate-readme.test.js`
- Modify: `README.template.md`
- Modify: `README.md`

- [ ] **Step 1: Write failing overview tests**

Add this test to `tests/generate-readme.test.js` after the existing placeholder tests:

```javascript
test("README template presents hacker systems and custom engine focus", () => {
  const template = fs.readFileSync(path.join(ROOT_DIR, "README.template.md"), "utf8");

  assert.match(template, /low-level systems/i);
  assert.match(template, /custom C\+\+ game tech/i);
  assert.match(template, /security-oriented tools/i);
  assert.match(template, /## Current Focus/);
  assert.match(template, /custom C\+\+ game engine/i);
  assert.match(template, /C\+\+ games/i);
  assert.match(template, /reverse engineering/i);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: FAIL because the template does not yet contain the new overview copy.

- [ ] **Step 3: Add intro and focus content**

In `README.template.md`, insert this content immediately after the banner `</div>` and before the first `---`:

```markdown
<p align="center">
  I build low-level systems, custom C++ game tech, and security-oriented tools.
</p>

## Current Focus

- Building a custom C++ game engine and runtime tooling.
- Developing custom C++ games with engine-level control.
- Studying reverse engineering, binary internals, and security research.
- Working close to graphics, memory, performance, and native tooling.
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Regenerate README**

Run: `npm run generate`

Expected: `README.md` contains the new intro and focus section with `Wsh7Ash` substituted for username placeholders.

- [ ] **Step 6: Verify no generated placeholders remain**

Run: `rg -n -F "{{" README.md`

Expected: exit 1 with no matches.

- [ ] **Step 7: Commit**

```bash
git add README.template.md README.md tests/generate-readme.test.js docs/superpowers/specs/2026-05-24-hacker-engine-overview-design.md docs/superpowers/plans/2026-05-24-hacker-engine-overview.md
git commit -m "docs: focus profile overview on systems and game tech"
```

---

## Self-Review

- Spec coverage: The plan adds the approved intro and focus section while preserving the existing generator, metrics, stats, and support links.
- Placeholder scan: The plan has concrete code, paths, commands, and expected results.
- Type consistency: The test paths and placeholder names match the current repository.
