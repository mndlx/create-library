# virtuallab-create-library

A small, manifest-driven scaffolding system. It generates projects from
**templates** and ships a terminal **back-office** to create and configure those
templates so they can be reused across apps.

## Usage

Scaffold a project from a template:

```bash
npx virtuallab-create-library
```

It discovers the available templates, asks the template's questions, and writes
the project into a new folder. Then follow the printed next steps.

## Back-office

Create and configure templates interactively:

```bash
npx virtuallab-create-library-bo
```

From the menu you can:

- **List** the discovered templates
- **Create** a new template skeleton (manifest + `template/` payload)
- **Configure** a template — add prompts, dependencies, scripts and post-generate hooks
- **Validate** a template's manifest
- **Register** an external templates directory

## Templates

A template is a folder with a `template.json` manifest and a `template/` payload:

```
my-template/
  template.json
  template/        # files copied into the generated project
```

`template.json`:

```jsonc
{
  "name": "my-template",
  "title": "Human readable title",
  "nameVar": "name",                 // prompt whose answer names the output folder
  "prompts": [
    {
      "name": "name",
      "message": "Provide a name for your project",
      "type": "text",               // "text" | "select"
      "default": "my-app",
      "token": "REPLACE",           // __REPLACE__ in the payload -> answer
      "validate": "packageName"      // "packageName" | "nonEmpty" | "none"
    }
  ],
  "detokenize": { "exclude": [] },   // path fragments to skip during replacement
  "packageJson": {                    // merged into the generated package.json
    "dependencies": {},
    "devDependencies": {},
    "scripts": {}
  },
  "hooks": { "postGenerate": [] },    // shell commands run in the project
  "nextSteps": ["cd __REPLACE__", "npm install"]
}
```

Tokens are replaced across **every text file** of the payload, so there is no
hardcoded file list to maintain.

## Where templates live

Templates are discovered, in order, from:

1. the bundled `templates/` directory,
2. directories listed in the `VLCL_TEMPLATES_DIR` environment variable
   (OS path-delimiter separated),
3. directories saved in `~/.virtuallab-create-library.json` (`{ "templateDirs": [] }`).

The first template found for a given `name` wins.

## Architecture

The engine (`engine/`) is framework-agnostic and UI-free: manifest loading and
validation, template discovery, generation (copy + tree-wide detokenize +
package.json merge + hooks) and prompts. The `generate` and `bo` CLIs are thin
layers on top, which keeps the door open for a future web back-office on the same
engine.

## Development

```bash
npm install
npm run build      # compile TypeScript
npm run dev        # run the generator
npm run bo         # run the back-office
```
