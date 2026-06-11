# Templates & tokens

## Template layout

A template is a directory containing a `template.json` manifest and a payload.

```
my-template/
  template.json
  template/         # default payload location (manifest "source": "template")
  features/         # optional overlays (one folder per feature)
```

The `template/` subfolder is **optional**. A template may be *flat* — set
`"source": "."` and keep the payload at the template root. For flat templates
the authoring files (`template.json`, `features/`) are excluded from generated
output unless you opt in ("Include manifest files" in Generate).

### Importing an existing directory

In the back-office, **New template → Import from directory** copies any folder
as the payload (`node_modules`, `.git`, `dist` excluded) and auto-detects its
tokens. Handy for turning an existing project into a reusable template.

## Manifest (`template.json`)

| Field | Meaning |
|-------|---------|
| `name` | Unique template id. |
| `title`, `description` | Shown in the UI/CLI. |
| `output` | `new` (create a folder) or `merge` (integrate into an existing project). |
| `source` | Payload location; default `template`, or `.` for flat. |
| `tokenConfig` | `{ "start": "@@", "end": "@@" }` — delimiters for dynamic tokens. |
| `prompts` | Per-token metadata (question, default, type, options, validate, exposeCli). |
| `features` | Optional, conditional parts (overlays / package.json / injects / tokens). |
| `nextSteps` | Lines printed after generation (tokens are substituted). |

## Dynamic tokens

Wrap a token in the configured delimiters, e.g. `@@COMPONENT@@`. Tokens are
matched in **file contents and in file/dir names**.

- New templates default to `@@…@@`. Templates without a `tokenConfig` fall back
  to the legacy `__…__` delimiters.
- Tokens are **auto-detected** by scanning the payload (and feature overlays).
  The detected set drives the inspector and what's asked at generation.
- Each token has metadata you can edit (the *inspector*): the question, a
  default, type (`text`/`select`), and `exposeCli` — whether the CLI prompts for
  it (default `true`; if `false` the default is used).
- After manual edits in the editor, use **Sync from files** to re-scan.

> **Replacement not working?** Check that the delimiters in
> *Author → Token configuration* match what you actually wrote in the files.
> `@@VAR@@` won't be replaced by a template configured for `__…__`.

### Example

`template/src/components/@@COMPONENT@@/@@COMPONENT@@.tsx`

```tsx
export function @@COMPONENT@@({ title = '@@TITLE@@' }) {
  return <h3>{title}</h3>;
}
```

Generating with `COMPONENT=Todo`, `TITLE="My tasks"` produces
`src/components/Todo/Todo.tsx` with both tokens substituted.

## Features

A feature is a toggle (`boolean`) or choice (`select`) that contributes:

- `overlay` — a folder copied over the output when active.
- `packageJson` — fields merged into `package.json`.
- `inject` — snippets inserted at `/* inject:<marker> */` markers.
- `tokens` — extra token values.
