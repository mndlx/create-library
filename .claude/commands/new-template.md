---
description: Scaffold or import a new template
---

Create a new template for create-library. Arguments: `$ARGUMENTS` (template
name, optionally followed by a source directory to import).

1. Confirm the template **name**, **output** mode (`new` or `merge`), payload
   **layout** (`template/` subfolder or flat `.`), and target **directory**.
2. If a source directory was given, import it (copy as payload, excluding
   `node_modules`/`.git`); otherwise scaffold a minimal template.
3. Prefer doing this through the engine (`scaffoldTemplate` / `importTemplate`)
   or the running back-office API rather than hand-writing files.
4. After creating, list the auto-detected tokens so the user can fill in their
   metadata.

Dynamic tokens use `@@…@@`. Remind the user that tokens are picked up from both
file contents and file/dir names.
