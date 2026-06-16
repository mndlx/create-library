# Templates & parameters

Templates are standard **`dotnet new`** templates. This tool discovers, edits
and generates them; it does not define its own format.

## Layout

```
my-template/
  .template.config/
    template.json     # the manifest
  MyProject.csproj    # payload — copied & transformed by dotnet new
  src/Program.cs
```

A directory is a template when it contains `.template.config/template.json`.

## Manifest (`template.json`)

| Field | Meaning |
|-------|---------|
| `identity` | Globally-unique id. |
| `name` | Display name. |
| `shortName` | What you type: `dotnet new <shortName>` — the id used across the UI/CLI. |
| `author`, `classifications`, `tags` | Metadata (e.g. `tags.language`, `tags.type`). |
| `sourceName` | A string in the source renamed to the value of `dotnet new -n <name>` (file names and contents). |
| `symbols` | The parameters (see below). |

## Parameters (`symbols`)

Each user input is a symbol of `"type": "parameter"`:

```jsonc
"symbols": {
  "Framework": {
    "type": "parameter", "datatype": "choice",
    "choices": [{ "choice": "net8.0" }, { "choice": "net10.0" }],
    "defaultValue": "net10.0", "replaces": "TARGET_FW"
  },
  "Greeting": { "type": "parameter", "datatype": "string", "defaultValue": "Hello", "replaces": "GREETING" },
  "UseTests": { "type": "parameter", "datatype": "bool", "defaultValue": "false" }
}
```

- **datatype** — `string` (free text), `bool` (true/false), `choice` (one of
  `choices`), `text`.
- **defaultValue** — used when the value isn't supplied.
- **replaces** — the literal token in the payload files that the chosen value
  substitutes. (No special delimiters — pick a token unlikely to collide,
  e.g. `TARGET_FW`.)

In the back-office, the **Parameters** tab edits these; edits auto-save to
`template.json`. At generation each is passed as `--<SymbolName> <value>`.

## Generation

```
dotnet new install <templateDir> --force
dotnet new <shortName> -o <outDir> -n <name> [--<Symbol> <value> ...]
dotnet new uninstall <templateDir>
```

The back-office and the generate CLI run exactly this. `-n <name>` both names
the output and replaces `sourceName`; the optional `<name>/` subfolder is a
convenience of this tool (it sets `-o <out>/<name>`).

See the [.NET templating docs](https://learn.microsoft.com/dotnet/core/tools/custom-templates)
for the full manifest schema (conditional content, modifiers, post-actions…).
