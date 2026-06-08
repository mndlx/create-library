"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHooks = void 0;
const child_process_1 = require("child_process");
/** Run post-generate shell commands sequentially in `cwd`. Throws on first failure. */
const runHooks = (commands, cwd) => {
    for (const command of commands) {
        const result = (0, child_process_1.spawnSync)(command, { cwd, shell: true, stdio: 'inherit' });
        if (result.status !== 0) {
            throw new Error(`Post-generate hook failed (exit ${result.status}): ${command}`);
        }
    }
};
exports.runHooks = runHooks;
