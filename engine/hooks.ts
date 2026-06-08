import { spawnSync } from 'child_process';

/** Run post-generate shell commands sequentially in `cwd`. Throws on first failure. */
export const runHooks = (commands: string[], cwd: string): void => {
    for (const command of commands) {
        const result = spawnSync(command, { cwd, shell: true, stdio: 'inherit' });
        if (result.status !== 0) {
            throw new Error(`Post-generate hook failed (exit ${result.status}): ${command}`);
        }
    }
};
