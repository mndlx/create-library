# virtuallab-create-library

A manifest-driven scaffolding system. It generates projects from **templates**,
lets you **configure what each template produces** (components, Storybook, tests,
styling…) through conditional features, and ships a terminal **back-office** to
create, configure and tokenize templates so they can be reused across apps.

## Generate a project

```bash
npx virtuallab-create-library
```

It discovers the available templates, asks the template's questions, lets you
toggle its features, and writes the configured project into a new folder.

Flags:

- `--yes` / `-y` — accept defaults, no prompts
- `--save-preset <file>` / `--preset <file>` — save / reuse a configuration
- `--into <dir>` — target directory (defaults to the current directory)
- `--merge` / `--new` — force the output mode (otherwise the template decides)
- `--force` — in merge mode, overwrite conflicting files

## Back-office

```bash
npx virtuallab-create-library-bo
```

A **web** back-office is also available — same capabilities in the browser:

```bash
npm run bo:web        # or: npx virtuallab-create-library-bo-web
```

It starts a local server on http://localhost:4517 (or the next free port) and opens it automatically. Override with `PORT=5000 npm run bo:web`.

From the menu you can:

- **Configure & generate** — pick a template, answer its variables, choose features, generate now
- **Configure & save preset** / **Generate from preset**
- **Create template** — scaffold a new template (choose `new` or `merge` output)
- **Add variable to template** — define a dynamic variable (the field create-library will ask)
- **Add component to template** — create a component overlay and register it as a feature
- **Set template output mode** — `new` (folder) or `merge` (integrate)
- **List / Validate** templates and **register external directories**

## How a template works

A template is a folder with a `template.json` manifest, a base `template/`
payload, and optional feature overlays:

```
my-template/
  template.json
  template/            # base payload, always copied
  features/
    storybook/         # overlay copied only when the feature is enabled
    tests/
    styling-css/
```

Generation: copy the base payload → overlay each enabled feature → resolve
`/* inject:<marker> */` snippets → merge `package.json` (base + features) →
replace `__TOKEN__` placeholders across every text file → run hooks.

### Output mode

A template declares how it is delivered with `"output"`:

- `"new"` (default) — create a brand-new project folder named after a variable.
- `"merge"` — integrate the template into an **existing project**: files are copied
  in (existing files are kept unless `--force`), and the template's dependencies
  and scripts are merged into the project's `package.json` (name and version are
  preserved). Run `create-library` from inside the project, or pass `--into <dir>`.

Tokens are replaced in **file contents and in file/directory names**, so a payload
like `src/components/__NAME__/__NAME__.tsx` becomes `src/components/Card/Card.tsx`.

The bundled `react-component` template is a `merge` example: it asks for a component
name and adds `src/components/<Name>/` into your app.

### Manifest

```jsonc
{
  "name": "my-template",
  "nameVar": "name",                     // prompt whose answer names the folder
  "prompts": [
    { "name": "name", "message": "Project name", "type": "text",
      "default": "my-app", "token": "REPLACE", "validate": "packageName" }
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
        "mui": { "overlay": "features/styling-mui", "packageJson": { } },
        "css": { "overlay": "features/styling-css" }
      }
    },
    {
      "id": "button", "label": "Include a Button", "type": "boolean", "default": false,
      "overlay": "features/button",
      "inject": [
        { "file": "src/components/index.ts", "marker": "componentExports",
          "content": "export * from './Button';" }
      ]
    }
  ],
  "nextSteps": ["cd __REPLACE__", "npm install"]
}
```

A feature can contribute an **overlay** (files), a **packageJson** patch
(dependencies / scripts), **inject** snippets (at `/* inject:<marker> */`
markers in base files), and **tokens**.

### Presets

A preset is just a saved configuration:

```json
{ "template": "vite-react-ubundle",
  "answers": { "name": "acme-ui" },
  "features": { "styling": "css", "storybook": false, "tests": true, "button": true } }
```

## Where templates live

Discovered, in order, from: the bundled `templates/` directory, the
`VLCL_TEMPLATES_DIR` environment variable (OS path-delimiter separated), and
directories saved in `~/.virtuallab-create-library.json`. First name wins.

## Architecture

The engine (`engine/`) is UI-free and reusable: manifest load/validate,
discovery, feature resolution, overlay + inject, package.json merge, token
replacement, presets, scaffolding. The `generate` and `bo` CLIs are thin layers
on top, leaving room for a future web back-office on the same engine.

## Development

```bash
npm install
npm run build      # compile TypeScript
npm run dev        # run the generator
npm run bo         # run the back-office
```
