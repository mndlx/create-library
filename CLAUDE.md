# create-library — working notes for Claude

Manifest-driven template engine (`engine/`), a CLI (`bin/`), and a React/MUI
back-office (`bo-web/` → builds into `web/`, served by `bin/bo-web.ts`).

## Build & run

- `yarn build` — compile `engine/` + `bin/` (tsc). Run after editing any `.ts`
  under those; the committed `.js` next to each source is what actually runs.
- `yarn bo:web:build` — build the back-office UI into `web/`.
- `yarn bo:web` — start the back-office (port 4517, next free port if busy).
- `yarn bo:web:ui` — Vite dev server with `/api` proxy (needs `bo:web` running).
- After changing `bo-web/`, rebuild and hard-reload; HTML is served `no-store`
  and hashed assets are immutable, so a normal reload picks up new builds.

## Conventions

- **UI dialogs only** — never `window.alert/prompt/confirm`; use the MUI dialog
  helpers in `bo-web/src/components/dialogs.tsx` (`useDialogs().prompt/confirm`).
- **Inspector / detail panels** — build them with the primitives in
  `bo-web/src/components/inspector.tsx`, never ad-hoc layouts. House style:
  flat collapsible `Section`s (overline header + optional description) separated
  by dividers; inside, `Field` for compact "label-left / control-right" rows,
  `SwitchField` for toggles, `StackedField` for wide inputs, and `PanelInput`/
  `PanelSelect` (filled, compact) for every control. Folder paths use
  `FolderField` (server-backed picker), not free-text. See the `panel-ui` skill.
- Engine stays framework-free and synchronous where possible; the server is a
  thin HTTP layer over `engine/`.
- Dynamic tokens default to `@@…@@`; templates without `tokenConfig` use the
  legacy `__…__`. Tokens are auto-detected from file contents and names.
- Generation must never leak authoring files (`template.json`, `features/`) into
  output for flat templates unless `includeManifest` is set.

## Gotchas

- The server reads compiled `bin/*.js`; restart it after `yarn build`.
- Template discovery is cached per process via `listTemplates()` calls — the BO
  re-reads on each `/api/state`.
- Don't commit build artifacts beyond `web/` (which ships the prebuilt UI);
  `*.tsbuildinfo` and `node_modules` are ignored.

## Docs

Project docs live in `docs/` (overview, back-office, templates-and-tokens, cli).
