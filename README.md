# virtuallab-create-library

A front-end for the standard **`dotnet new`** template engine. It discovers
`dotnet new` templates, lets you edit their files and parameters in a
React/MUI web back-office (Visual-Studio-style Solution Explorer + Monaco
editor), and generates projects by shelling out to the .NET CLI — so the output
is exactly what `dotnet new` produces.

Requires the **.NET SDK** on `PATH` (`dotnet`). Full docs in [`docs/`](docs/README.md).

## Generate a project (CLI)

```bash
npm run dev            # bin/generate.js — pick a template, answer parameters
```

Discovers templates under the registered directories, asks for the project
**name** (`-n`) and each parameter (the manifest's `symbols`), asks whether to
nest the output in a `<name>/` subfolder, then runs `dotnet new`.

Flags: `--template <shortName>` / `-t`, `--name <n>` / `-n`, `--into <dir>` / `-o`,
`--flat` (don't create a `<name>` subfolder), `--force`, `--yes` / `-y`.

## Back-office (web)

```bash
npm run bo:web         # or: npx virtuallab-create-library-bo-web
```

Starts a local server on http://localhost:4517 (next free port if busy;
override with `PORT=5000`). Dark-theme single-page app:

- **Solution Explorer** (left) — registered template directories as
  *containers*, the `dotnet new` templates inside them as *projects*, expand a
  project to its files. Clicking a file opens it in the editor.
- **Editor** (center) — VSCode-style Monaco editor: tabs, save (`Ctrl+S`),
  new/rename/delete/move with confirmation, drag-and-drop.
- **Right panel** — tabbed for the selected template:
  - *Parameters* — the manifest `symbols`: datatype (string/bool/choice),
    default, and **Replaces** (the literal token the value substitutes).
    Edits auto-save to `template.json`.
  - *Generate* — set the name and parameter values, pick a target folder and
    whether to create a `<name>/` subfolder, run `dotnet new`.
  - *Settings* — short name, display name, source name, author, tags;
    rename / validate / delete.
- **New template** — scaffold a `.template.config/template.json` skeleton.
- **Open folder…** — register/browse any directory; templates inside it appear.

## How a template works

A template is a folder with `.template.config/template.json` (the
[schemastore "template" schema](http://json.schemastore.org/template)):

```jsonc
{
  "$schema": "http://json.schemastore.org/template",
  "author": "you",
  "identity": "Acme.Lib",
  "name": "Acme Library",
  "shortName": "acme-lib",
  "tags": { "language": "C#", "type": "project" },
  "sourceName": "MyProject",          // renamed by `dotnet new -n <name>`
  "symbols": {
    "Framework": {
      "type": "parameter", "datatype": "choice",
      "choices": [{ "choice": "net8.0" }, { "choice": "net10.0" }],
      "defaultValue": "net10.0", "replaces": "TARGET_FW"
    },
    "Greeting": { "type": "parameter", "datatype": "string", "defaultValue": "Hello", "replaces": "GREETING" }
  }
}
```

Generation = `dotnet new install <dir> → dotnet new <shortName> -o <out> -n
<name> [--<symbol> <value>] → dotnet new uninstall`.

## Where templates live

Discovered from: the bundled `templates/` directory, the `VLCL_TEMPLATES_DIR`
environment variable (OS path-delimiter separated), and directories registered
in `~/.virtuallab-create-library.json`. A registered directory may itself be a
template (hold `.template.config`) or be a parent of several. First `shortName`
wins.

## Architecture

The engine (`engine/dotnet.ts`) is the dotnet adapter: discover/parse
templates, expose symbols, generate via the CLI, scaffold a skeleton. The
generate CLI (`bin/generate.ts`) and the web back-office server
(`bin/bo-web.ts`) are thin layers over it.

## Development

```bash
yarn install
yarn build            # compile engine + CLIs
yarn bo:web:build     # build the web UI into web/
yarn bo:web           # run the back-office server
yarn bo:web:ui        # Vite dev server with /api proxy (alongside bo:web)
```
