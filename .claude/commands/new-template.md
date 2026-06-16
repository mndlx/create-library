---
description: Scaffold a new dotnet new template
---

Create a new `dotnet new` template for create-library. Arguments:
`$ARGUMENTS` (display name, optionally a short name).

1. Confirm the **display name**, **short name** (`dotnet new <shortName>`),
   **source name** (the string `-n` renames at generation), and target
   **directory**.
2. Scaffold a `.template.config/template.json` skeleton — prefer the engine
   (`scaffoldDotnetTemplate`) or the running back-office API over hand-writing.
3. After creating, add payload files and define **parameters** (manifest
   `symbols`: datatype string/bool/choice, default, and `replaces` = the literal
   token the value substitutes). `sourceName` is renamed by `dotnet new -n`.
4. Generation runs `dotnet new` — remind the user the .NET SDK must be on PATH.
