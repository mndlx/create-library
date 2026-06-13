---
name: manage-templates
description: Author, configure, and generate create-library templates — scaffold or import templates, define dynamic @@tokens@@, manage features, and generate/merge projects via the engine, CLI, or back-office. Use when working with template.json manifests, dynamic tokens, or the bo-web UI in this repo.
---

# Managing create-library templates

This repo is a manifest-driven template engine. Use this skill when the task
involves creating, editing, or generating templates.

## Mental model

- A **template** = a `template.json` manifest + a payload of files. Payload lives
  in a `template/` subfolder (`source: "template"`) or flat at the root
  (`source: "."`).
- **Dynamic tokens** are wrapped in delimiters (`@@…@@` by default, configurable
  per template via `tokenConfig`; legacy templates use `__…__`). They are
  auto-detected from file **contents and names**, then asked at generation.
- **Features** are optional toggles contributing overlays, package.json fields,
  injects, or extra tokens.
- **Output**: `new` creates a folder; `merge` integrates into an existing project.

## Recipes

**Scaffold / import**: use `scaffoldTemplate` (samples) or `importTemplate`
(copy an existing dir as payload) from `engine/`, or the back-office
*New template* dialog. Importing excludes `node_modules`/`.git`/`dist`.

**Define a token**: write `@@NAME@@` in a file or filename. It appears in the
inspector automatically. Edit its question/default/type and `exposeCli` (whether
the CLI prompts for it). Re-scan with *Sync from files* after manual edits.

**Generate**: from the CLI (`node ./bin/generate.js`, flags in `docs/cli.md`) or
the back-office *Generate* view. For flat templates, authoring files are excluded
from output unless `includeManifest` is set.

## Rules

- Always `yarn build` after editing `.ts` under `engine/` or `bin/`; restart the
  server to pick up changes.
- In the UI, use MUI dialogs — never native `alert/prompt/confirm`.
- Build any detail/inspector/settings panel with the shared primitives in
  `bo-web/src/components/inspector.tsx` (see the `panel-ui` skill) — flat
  `Section`s, `Field`/`SwitchField`/`StackedField`, `PanelInput`/`PanelSelect`.
- If replacement "doesn't work", verify the configured delimiters match what's
  in the files.

See `docs/` for full details.
