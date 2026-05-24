# Hacker Engine Overview Design

Date: 2026-05-24

## Goal

Refresh the GitHub profile overview so it clearly presents `Wsh7Ash` as a hacker systems developer building custom C++ game engines and C++ games.

## Context

The profile README is generated from `README.template.md` by `generate-readme.js`. The current overview already includes a banner, tech badges, GitHub stats, metrics plugins, picoCTF stats, and support links. It does not currently have a concise first-screen intro or a focused section about custom engine/game work.

## Design

Keep the existing generator and metrics pipeline unchanged. Update only the profile content template and tests that guard the generated content contract.

The updated profile should:

1. Keep the visitor counter and banner at the top.
2. Add a short intro immediately below the banner:
   - Low-level systems
   - Custom C++ game tech
   - Security-oriented tooling
3. Add a `Current Focus` section before the tech stack:
   - custom C++ game engine
   - C++ games
   - reverse engineering/security research
   - graphics/runtime/tooling work
4. Keep the existing badge sections, stats, metrics, picoCTF stats, and support links.
5. Preserve all generator placeholders: `{{GITHUB_USERNAME}}`, `{{PLUGINS}}`, and `{{PICOCTF_STATS}}`.

## Testing

Add template contract tests proving the new intro/focus content exists and the required placeholders remain present. Run the existing generator tests, regenerate `README.md`, and verify the generated README has no unreplaced placeholders.

## Out of Scope

This update will not rewrite history, change metrics SVG contents, modify GitHub Actions behavior, or remove support links.
