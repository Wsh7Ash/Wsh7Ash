# README Generator Update Design

Date: 2026-05-24

## Goal

Restore the generated metrics plugin section, make missing generator inputs fail loudly, and move profile-specific usernames into a small config layer while preserving the current generated profile by default.

## Current Context

This repository generates a GitHub profile `README.md` from `README.template.md` using `generate-readme.js`. Metrics plugin metadata lives in `plugins/*.json`; GitHub Actions generates the SVG files and runs the generator. picoCTF stats are scraped by `picoctf-scraper.js` and then rendered into the README.

The generator currently calls `template.replace("{{PLUGINS}}", renderPlugins(plugins))`, but `README.template.md` does not contain `{{PLUGINS}}`. Because JavaScript string replacement is silent when a token is missing, the configured metrics plugins are omitted from `README.md` without an error.

## Approach

Keep the current plain Node.js structure. Add targeted tests using Node's built-in `node:test` runner, then refactor only enough to make the generator validate required placeholders and load profile config cleanly.

## Architecture

The update has three small units:

1. `generate-readme.js` remains the CLI entry point and exports testable functions.
2. `profile.config.json` stores default usernames for GitHub, picoCTF, and LeetCode.
3. `tests/generate-readme.test.js` covers the README generation contract using temporary fixture directories.

`README.template.md` will regain the `{{PLUGINS}}` placeholder under the metrics heading and use username placeholders for GitHub profile URLs. `generate-readme.js` will replace all known placeholders and throw an explicit error if any required placeholder is absent from the template. `picoctf-scraper.js` will keep accepting a CLI username argument, but will default to the configured picoCTF username.

## Data Flow

1. GitHub Actions or a local user runs `node generate-readme.js`.
2. The generator reads `profile.config.json`, `README.template.md`, `plugins/*.json`, and `picoctf-stats.json` if present.
3. The generator validates that the template contains every required placeholder.
4. Plugin JSON files are parsed, validated, filtered by `enabled`, sorted by `order`, and rendered as Markdown image links.
5. The final README is written to `README.md`.

## Error Handling

The generator will throw clear errors for missing template placeholders and invalid enabled plugin entries. Missing `picoctf-stats.json` remains non-fatal and renders the existing "stats not found" comment, because that file is produced by a separate scraper workflow and may legitimately be absent in local runs.

## Testing

Use Node's built-in test runner so the repository does not need another dependency. Tests will cover:

1. `README.template.md` includes the `{{PLUGINS}}` placeholder.
2. Missing required placeholders fail with a clear error.
3. Valid fixture input renders plugins, configured usernames, and picoCTF stats.
4. Invalid enabled plugin config fails clearly.

## Scope Boundaries

This change will not regenerate metrics SVG content manually, change the visual badge list, or redesign the profile. It only restores omitted generated content and hardens the generator path.
