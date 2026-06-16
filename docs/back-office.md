# Back-office (web)

A React + MUI single-page app (dark theme) for browsing, editing and
generating `dotnet new` templates. Source in `bo-web/`; it builds into `web/`,
which the `bo-web` server serves alongside the HTTP API. The server shells out
to `dotnet`, so the .NET SDK must be on PATH.

## Running

```bash
yarn bo:web            # build output served at http://localhost:4517 (next free port if busy)
# development with hot reload:
yarn bo:web            # API server
yarn bo:web:ui         # Vite dev server (proxies /api), in a second terminal
```

Rebuild the UI after editing `bo-web/`: `yarn bo:web:build`. Override the port
with `PORT=5000 yarn bo:web`.

## Layout

- **Solution Explorer** (left, resizable) — a Visual-Studio-style tree: each
  registered templates directory is a *container*; the `dotnet new` templates
  inside are *projects*; expand a project to see its files. Click a project to
  select it; click a file to open it in the editor; right-click a project for
  Rename / Delete.
- **Editor** (center) — Monaco editor with tabs, `Ctrl+S` to save, and
  new/rename/delete/move (with confirmation and drag-and-drop). Always mounted,
  so switching projects/files never blanks it.
- **Right panel** (resizable, tabbed) for the selected template:
  - **Parameters** — the manifest `symbols`. Per parameter: datatype
    (string/bool/choice), default, **Replaces** token, description, choices.
    Edits **auto-save** to `template.json`; add/remove parameters inline.
  - **Generate** — set the **Name (-n)** and parameter values, pick a **Target
    folder**, toggle whether to create a `<name>/` subfolder and `--force`,
    then run `dotnet new`. The dotnet output is shown.
  - **Settings** — short name (rename), display name, source name, author,
    tags; validate; delete.

## Top bar

- **New template** — scaffold a `.template.config/template.json` skeleton in a
  chosen directory (registered automatically).
- **Open folder…** — browse and register any directory; templates inside it
  appear in the Solution tree. Also usable as an editable workspace.

## Notes

- All dialogs are MUI dialogs (never native `alert`/`prompt`/`confirm`).
- Detail panels are built from the primitives in
  `bo-web/src/components/inspector.tsx` (see the `panel-ui` skill).
- The server binds to `127.0.0.1`; its file APIs can read/write the directories
  you point them at — a local dev tool, don't expose the port.
