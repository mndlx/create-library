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

## Layout: editor + right panel

The editor (center) is a VSCode-style Monaco editor over the selected template —
or any folder opened via **Open folder…**. Resizable explorer, drag-and-drop
move, selection-aware create, rename/delete with confirmation. `Ctrl+S` saves.

Everything about the selected template lives in the resizable **right panel**:

- **Template settings** — title, description, version, validate.
- **Variables** — the auto-detected inspector. Edits **auto-save**; **Sync**
  re-scans after manual edits; per-token CLI switch. Token delimiters are
  read from `tokenConfig` in `template.json` (edit them there); a warning
  appears when files use a different delimiter style.
- **Generate to folder** — fill the variable values and merge the output —
  every placeholder replaced — into a target folder picked with the built-in
  folder browser (created if missing, existing files kept unless overwrite);
  presets; optional inclusion of the template meta files.
- **Publish to registry** — version bump (patch/minor/major) and a snapshot
  (placeholders intact) into `~/.virtuallab-create-library/published`; the CLI
  uses the latest published version of each template.
- **Components & dirs** — component scaffolding; register external dirs.

**Export** (top bar) generates from the latest **published** version: a dialog
asks for the variable values, then the result — placeholders replaced, same
engine output the CLI produces — downloads as `<name>-<version>.zip`.

Unsaved editor changes are guarded: switching template or closing the page asks
for confirmation.

## Persistence

- Created/imported templates register their parent directory (user config at
  `~/.virtuallab-create-library.json`) so they survive restarts.
- The opened workspace is remembered (localStorage) and restored on reload.

## Notes

- All dialogs are MUI dialogs (never native `alert`/`prompt`/`confirm`).
- The server is bound to `127.0.0.1`. The file APIs can read/write any directory
  you point them at — it is a local dev tool; don't expose the port.
