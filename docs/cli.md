# CLI

Generate a project from a template without the web UI.

```bash
node ./bin/generate.js          # interactive: pick a template, answer prompts
# or, once published / linked:
npx virtuallab-create-library
```

## Flags

| Flag | Effect |
|------|--------|
| `--new` / `--merge` | Force the output mode (default: the template's `output`). |
| `--into <dir>` | Target directory (default: current working directory). |
| `--preset <file>` | Generate from a saved preset (skips prompts). |
| `--save-preset <file>` | Save the chosen answers/features to a preset file. |
| `--force` | In merge mode, overwrite existing files. |
| `--yes`, `-y` | Use defaults, no prompts. |

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
