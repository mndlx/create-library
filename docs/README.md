# create-library — documentation

`virtuallab-create-library` is a manifest-driven engine for scaffolding and
configuring project templates, with a CLI and a React/MUI back-office (BO).

## Contents

- [Back-office (web UI)](back-office.md) — the visual editor for authoring and generating templates.
- [Templates & tokens](templates-and-tokens.md) — template layout, dynamic tokens, features.
- [CLI](cli.md) — generating from the command line, presets.

## At a glance

A **template** is a folder with a `template.json` manifest plus a payload of
files. Generating a template copies the payload into a new project (`new`) or
merges it into an existing one (`merge`), replacing **dynamic tokens**
(`@@name@@` by default) with values you provide.

```
templates/
  my-template/
    template.json        # manifest (name, output, tokenConfig, prompts, features)
    template/            # payload — copied to the output (the "template/" folder is optional)
    features/            # optional overlays toggled at generation time
```

## Quick start

```bash
yarn install
yarn build          # compile engine + bin
yarn bo:web         # start the back-office at http://localhost:4517
# or generate from the CLI:
node ./bin/generate.js
```

See the topic pages above for details.
