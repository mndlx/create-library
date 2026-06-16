---
name: manage-templates
description: Author, configure, and generate dotnet new templates in this repo — scaffold or register .template.config templates, define parameter symbols, and generate projects via the .NET CLI, from the engine or the bo-web back-office. Use when working with template.json (.template.config), dotnet symbols, or the back-office UI.
---

# Managing dotnet templates

This tool is a front-end over the standard **`dotnet new`** template engine
(`engine/dotnet.ts`). Use this skill when creating, editing, or generating
templates.

## Mental model

- A **template** = a folder with `.template.config/template.json` (schemastore
  "template" schema). `shortName` is its id (`dotnet new <shortName>`).
- **Parameters** = the manifest's `symbols` of type `parameter`: a `datatype`
  (string / bool / choice), a `defaultValue`, and `replaces` (the literal token
  in the files the value substitutes). `sourceName` is renamed by `dotnet new -n`.
- **Generation** = the .NET CLI: `dotnet new install <dir> → dotnet new
  <shortName> -o <out> -n <name> [--<symbol> <value>] → dotnet new uninstall`.
  Output is exactly what `dotnet new` produces. Requires the .NET SDK on PATH.

## Recipes

- **Scaffold**: `scaffoldDotnetTemplate` (engine) or the back-office *New
  template* dialog — writes a `.template.config/template.json` skeleton.
- **Register existing**: point the back-office *Open folder…* / `addTemplateDir`
  at a directory of `dotnet new` templates; they appear in the Solution tree.
- **Add a parameter**: Parameters tab → set name/datatype/default/replaces, or
  `api.setSymbol`. Saved to `template.json` under `symbols`.
- **Generate**: Generate tab (name + params + target folder), `generateDotnet`,
  or just `dotnet new <shortName>` in a shell.

## Rules

- `yarn build` after editing `.ts` under `engine/` or `bin/`; restart the server.
- UI: MUI dialogs only; build detail panels with `inspector.tsx` (see `panel-ui`).
- Don't reintroduce the removed custom token engine (`@@…@@`, features, presets,
  publish/zip) — generation is `dotnet new`.
