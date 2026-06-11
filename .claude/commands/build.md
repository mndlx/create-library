---
description: Compile the engine, CLI, and back-office UI
---

Build the whole project and report any errors:

1. `yarn build` — compile `engine/` and `bin/` with tsc.
2. `yarn bo:web:build` — build the back-office UI into `web/`.

Surface the first failure with its output; do not claim success unless both
steps complete cleanly.
