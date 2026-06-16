# CLI

Generate a project from a `dotnet new` template without the web UI.

```bash
npm run dev            # bin/generate.js
# or, once linked/published:
npx virtuallab-create-library
```

Requires the .NET SDK on PATH.

## Flow

1. **Template** — pick from the discovered templates (or `--template <shortName>`).
2. **Name (-n)** — the project name; also replaces the template's `sourceName`.
3. **Parameters** — one prompt per `symbol`: text for `string`, yes/no for
   `bool`, a list for `choice`. Defaults are pre-filled.
4. **Location** — the target directory, and whether to nest the output in a
   `<name>/` subfolder (asked; default yes).

It then runs `dotnet new install → dotnet new <shortName> -o … -n … [--symbol
value] → dotnet new uninstall` and prints the .NET CLI output.

## Flags

| Flag | Effect |
|------|--------|
| `--template <shortName>`, `-t` | Use this template (skip the picker). |
| `--name <name>`, `-n` | Project name (`-n`). |
| `--into <dir>`, `-o` | Base output directory (default: cwd). |
| `--flat` | Don't create a `<name>` subfolder — write straight into `--into`. |
| `--force` | Pass `--force` to `dotnet new` (overwrite). |
| `--yes`, `-y` | Use defaults, no prompts. |

## Where templates come from

Discovered from: the bundled `templates/` directory, `VLCL_TEMPLATES_DIR`
(OS path-delimiter separated), and directories registered in
`~/.virtuallab-create-library.json`. A registered directory can be a template
itself (`.template.config`) or a parent of several.

## Authoring

The standalone terminal authoring menu is gone — author templates in the web
back-office (`npm run bo:web`): edit files, define parameters, scaffold new
templates. You can also create templates by hand (any folder with
`.template.config/template.json`) and register the directory.
