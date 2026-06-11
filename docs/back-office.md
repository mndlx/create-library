# Back-office (web UI)

A React + MUI single-page app (dark theme, AppBar + side drawer) for authoring
and generating templates. Source lives in `bo-web/`; it builds into `web/`,
which the `bo-web` server serves alongside the HTTP API.

## Running

```bash
yarn bo:web            # build output served at http://localhost:4517 (next free port if busy)
# development with hot reload:
yarn bo:web            # API server
yarn bo:web:ui         # Vite dev server (proxies /api), in a second terminal
```

Rebuild the UI after editing `bo-web/`:

```bash
yarn bo:web:build
```

`PORT=5000 yarn bo:web` overrides the port.

## Layout

- **AppBar** — view tabs (Editor / Generate / Author), **New template**,
  **Open folder…**, and the **Guide** (`?`).
- **Drawer** — the template list (resizable), the active **Workspace** (when a
  folder is opened), and the registered template dirs / cwd.

## Views

### Editor
A VSCode-style file editor (Monaco) over the selected template — or any folder
opened via **Open folder…**. Resizable explorer, drag-and-drop move,
selection-aware create, rename/delete with confirmation. `Ctrl+S` saves.

### Generate
Fill the template's variables, choose `new`/`merge` and a target directory, then
generate. Optionally save a preset or include the manifest files in the output.

### Author
- **Token configuration** — the `start`/`end` delimiters.
- **Variables (inspector)** — auto-detected tokens with editable
  question/default/type and a per-token CLI switch; **Sync from files** re-scans;
  **Add variable** declares a new one.
- **Add a component** — scaffolds a component + a feature toggle for it.
- **Maintenance** — register an external templates directory; validate.

## Persistence

- Created/imported templates register their parent directory (user config at
  `~/.virtuallab-create-library.json`) so they survive restarts.
- The opened workspace is remembered (localStorage) and restored on reload.

## Notes

- All dialogs are MUI dialogs (never native `alert`/`prompt`/`confirm`).
- The server is bound to `127.0.0.1`. The file APIs can read/write any directory
  you point them at — it is a local dev tool; don't expose the port.
