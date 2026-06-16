# create-library — documentation

`virtuallab-create-library` is a front-end for the standard **`dotnet new`**
template engine: a CLI and a React/MUI web back-office that discover, edit and
generate `dotnet new` templates. Generation shells out to the .NET CLI, so
output is exactly what `dotnet new` produces. Requires the **.NET SDK** on PATH.

## Contents

- [Back-office (web UI)](back-office.md) — Solution Explorer, editor, the template inspector.
- [Templates & parameters](templates-and-tokens.md) — `.template.config`, symbols, sourceName.
- [CLI](cli.md) — generating from the command line.

## At a glance

A **template** is a folder with `.template.config/template.json`. Its user
inputs are the manifest's **`symbols`** (parameters): a datatype
(string / bool / choice), a default, and `replaces` — the literal token in the
files the value substitutes. `sourceName` is renamed by `dotnet new -n`.

```
my-template/
  .template.config/
    template.json        # identity, name, shortName, sourceName, symbols
  MyProject.csproj       # payload files; sourceName/tokens replaced at generation
  src/...
```

## Quick start

```bash
yarn install
yarn build            # compile engine + CLIs
yarn bo:web           # start the back-office at http://localhost:4517
# or from the CLI:
npm run dev           # pick a template, answer parameters, dotnet new
```
