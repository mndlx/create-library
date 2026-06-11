---
description: Build the back-office UI and start the local server
---

Start the create-library back-office:

1. Run `yarn bo:web:build` to compile the React UI into `web/` (only if
   `bo-web/` changed since the last build).
2. Run `yarn bo:web` to start the server. Report the URL it prints
   (http://localhost:4517 or the next free port).

If the user passed `$ARGUMENTS`, treat it as a `PORT` override
(e.g. `PORT=$ARGUMENTS yarn bo:web`).
