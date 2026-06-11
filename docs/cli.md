# CLI

Generate a project from a template without the web UI.

```bash
node ./bin/generate.js          # interactive: pick a template, answer prompts
# or, once published / linked:
npx virtuallab-create-library
```

## Flow

1. **Template** — pick from the list (or pass `--template <name>` to skip).
   A card shows title, version, output mode, token delimiters, and counts.
2. **Variables** — each prompt shows the token it fills (e.g. `@@APIURL@@`),
   the question, and the default (`Enter` accepts it). Only `exposeCli` tokens
   are asked.
3. **Features** — yes/no or option selection per feature.
4. **Plan summary** — before writing anything the CLI prints what will happen:
   `NEW  creating new folder → <dir>` or `MERGE  merging into existing
   project → <dir>`, the active features, and a warning for any token that
   would be replaced with an empty value.

In **merge** mode nothing new is created: files are merged into the target
project (existing files kept unless `--force`), and the result lists added
and skipped files.

## Flags

| Flag | Effect |
|------|--------|
| `--template <name>`, `-t` | Use this template directly (skip the picker). |
| `--new` / `--merge` | Force the output mode (default: the template's `output`). |
| `--into <dir>` | Target directory (default: current working directory). |
| `--preset <file>` | Generate from a saved preset (skips prompts — the headless mode). |
| `--save-preset <file>` | Save the chosen answers/features to a preset file. |
| `--force` | In merge mode, overwrite existing files. |
| `--yes`, `-y` | Use defaults, no prompts (warns about empty token values). |

## Tokens and `exposeCli`

The CLI prompts for each detected/declared token, in order. A token whose
metadata has `exposeCli: false` is **not** prompted — its default is used. Set
this in the back-office (Author → Variables → the **CLI** switch) or directly in
`template.json`.

## Presets

A preset is a JSON file capturing a template name plus answers and feature
selections:

```json
{
  "template": "my-template",
  "answers": { "COMPONENT": "Todo", "TITLE": "My tasks" },
  "features": { "tests": true }
}
```

Create one with `--save-preset`, replay it with `--preset`.

## Where templates come from

Templates are discovered in:

1. the bundled `templates/` directory,
2. any path in the `VLCL_TEMPLATES_DIR` env var (OS path-separated),
3. directories registered in `~/.virtuallab-create-library.json`.

A registered directory may hold one template per child folder, or be a template
itself (contain `template.json`).
