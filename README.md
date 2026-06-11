# virtuallab-create-library

A manifest-driven scaffolding system. It generates projects from **templates**,
replaces **dynamic tokens** (`@@name@@`) with user-entered values across file
contents *and* file names, supports conditional **features**, and ships a
React/MUI web **back-office** to author, configure, version and publish
templates so they can be reused across apps.

Full docs live in [`docs/`](docs/README.md).

## Generate a project (CLI)

```bash
npx virtuallab-create-library
```

It discovers the available templates (including the latest **published**
version of each), asks the template's questions, lets you toggle its features,
and writes the configured project — every placeholder replaced.

Flags:

- `--yes` / `-y` — accept defaults, no prompts
- `--save-preset <file>` / `--preset <file>` — save / reuse a configuration
- `--into <dir>` — target directory (defaults to the current directory)
- `--merge` / `--new` — force the output mode (otherwise the template decides)
- `--force` — in merge mode, overwrite conflicting files

## Back-office (web)

```bash
npm run bo:web        # or: npx virtuallab-create-library-bo-web
```

Starts a local server on http://localhost:4517 (next free port if busy;
override with `PORT=5000`). Dark-theme single-page app:

- **Editor** (center) — VSCode-style Monaco editor over the template's files:
  resizable explorer, drag-and-drop move, selection-aware create,
  rename/delete with confirmation, dirty-state guards.
- **Right panel** — everything about the selected template:
  - *Template settings* — title, description, version, output mode, validate.
  - *Variables* — configurable token delimiters and an inspector of
    **auto-detected** tokens (question, default, type, CLI exposure) with
    auto-save and a mismatch warning when files use different delimiters.
  - *Export* — fill the variable values and produce output with every
    placeholder replaced (new folder, or merge into an existing project).
  - *Publish to registry* — bump (patch/minor/major) and snapshot the template
    (placeholders intact) into the local registry the CLI consumes.
  - *Components & dirs* — component scaffolding, external template dirs.
- **New template** — scaffold from samples or **import any directory** as a
  template payload (`node_modules`/`.git` excluded, tokens auto-detected).
- **Open folder…** — edit any directory as a workspace, no manifest needed.

## How a template works

A template is a folder with a `template.json` manifest, a payload (in a
`template/` subfolder, or flat at the root with `"source": "."`), and optional
feature overlays:

```
my-template/
  template.json
  template/            # base payload, always copied
  features/
    storybook/         # overlay copied only when the feature is enabled
    tests/
```

Generation: copy the base payload → overlay each enabled feature → resolve
`/* inject:<marker> */` snippets → merge `package.json` (base + features) →
replace dynamic tokens across every text file and path → run hooks.

### Dynamic tokens

Wrap a token in the template's delimiters — `@@…@@` by default, configurable
per template via `tokenConfig` (templates without one use the legacy `__…__`).
Tokens are auto-detected from file contents and names, so a payload like
`src/components/@@NAME@@/@@NAME@@.tsx` becomes `src/components/Card/Card.tsx`.
Each token carries metadata (question, default, type) and an `exposeCli` flag —
when `false`, the CLI uses the default instead of asking.

### Output mode

- `"new"` (default) — create a brand-new project folder named after a variable.
- `"merge"` — integrate into an **existing project**: files are copied in
  (existing files kept unless `--force`), and the template's dependencies and
  scripts are merged into the project's `package.json`.

### Manifest

```jsonc
{
  "name": "my-template",
  "version": "1.0.0",
  "tokenConfig": { "start": "@@", "end": "@@" },
  "nameVar": "name",
  "prompts": [
    { "name": "name", "message": "Project name", "type": "text",
      "default": "my-app", "token": "REPLACE", "validate": "packageName",
      "exposeCli": true }
  ],
  "features": [
    {
      "id": "storybook", "label": "Include Storybook",
      "type": "boolean", "default": true,
      "overlay": "features/storybook",
      "packageJson": { "devDependencies": { "storybook": "^8.3.0" } }
    },
    {
      "id": "styling", "label": "Styling", "type": "select",
      "options": ["mui", "css"], "default": "mui",
      "variants": {
        "mui": { "overlay": "features/styling-mui" },
        "css": { "overlay": "features/styling-css" }
      }
    }
  ],
  "nextSteps": ["cd @@REPLACE@@", "npm install"]
}
```

A feature can contribute an **overlay** (files), a **packageJson** patch,
**inject** snippets (at `/* inject:<marker> */` markers), and **tokens**.

## Versioning & publishing

From the back-office, *Publish to registry* exports a versioned snapshot of a
template into `~/.virtuallab-create-library/published/<name>/<version>/`
(optionally bumping `version` first). The CLI and the back-office discover the
**latest** published version of each template automatically; a local working
copy with the same name takes precedence.

## Where templates live

Discovered, in order, from: the bundled `templates/` directory, the
`VLCL_TEMPLATES_DIR` environment variable (OS path-delimiter separated),
directories saved in `~/.virtuallab-create-library.json` (a registered
directory may also *be* a template itself), and the published registry.
First name wins.

## Architecture

The engine (`engine/`) is UI-free and reusable: manifest load/validate,
discovery, token detection/replacement, feature resolution, overlay + inject,
package.json merge, presets, scaffolding/import, publishing. The CLIs and the
web back-office are thin layers on top.

## Development

```bash
yarn install
yarn build            # compile engine + CLIs
yarn bo:web:build     # build the web UI into web/
yarn bo:web           # run the back-office server
yarn bo:web:ui        # Vite dev server with /api proxy (alongside bo:web)
```
